"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "leaflet/dist/leaflet.css";
import {
  FaCheck,
  FaCompress,
  FaCrosshairs,
  FaExpand,
  FaMapMarkerAlt,
  FaMinus,
  FaPlus,
  FaSearch,
  FaTimes,
} from "react-icons/fa";
import { api } from "@/lib/api-client";
import { toFaDigits } from "@/lib/phone";
import { Spinner } from "@/components/ui/form";
import { cn } from "@/lib/utils";

const DEFAULT_CENTER = [35.6892, 51.389]; // تهران
const DEFAULT_ZOOM = 12;
const PIN_ZOOM = 17;
const PRECISE_ZOOM = 16; // کمتر از این، به کاربر پیشنهاد بزرگ‌نمایی می‌دیم
const IRAN_BOUNDS = [
  [24, 43.5],
  [40.5, 64],
];
const MOVE_DEBOUNCE_MS = 450;
const MIN_MOVE_METERS = 8; // جابه‌جایی‌های کوچک‌تر (مثل زوم) آدرس رو دوباره نمی‌گیرن

// کلاس‌های میزبان نقشه: حالت عادی (توی فرم) و تمام‌صفحه (چسبیده به body)
const HOST_INLINE = "relative h-full w-full";
const HOST_FULL = "fixed inset-0 z-[1100] bg-slate-50";

const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';

function metersBetween(a, b) {
  if (!a || !b) return Infinity;
  const R = 6371000;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// رنگ برند از روی پالت فعلی سایت (ادمین می‌تونه پالت رو عوض کنه، پس هاردکد نمی‌کنیم)
function brandColor() {
  if (typeof window === "undefined") return "#3368a0";
  return getComputedStyle(document.documentElement).getPropertyValue("--color-green-600").trim() || "#3368a0";
}

// دلیل شکست گرفتن موقعیت → کد کوتاه (فرم بر اساسش پیام فارسی نشون می‌ده)
function geoErrorReason(err) {
  if (!err) return "unsupported";
  if (err.code === 1) return "denied";
  if (err.code === 2) return "unavailable";
  if (err.code === 3) return "timeout";
  return "unavailable";
}

const glass = "bg-white/95 backdrop-blur-md shadow-lg shadow-slate-900/10 ring-1 ring-slate-900/5";
const railBtn =
  "flex h-11 w-11 items-center justify-center text-slate-700 transition hover:bg-green-50 hover:text-green-700 active:bg-green-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-600/25";
const ctrlBtn = cn(
  glass,
  "flex h-11 w-11 items-center justify-center rounded-2xl text-slate-700 transition hover:bg-green-50 hover:text-green-700 active:scale-95 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-600/25",
);

/**
 * انتخاب موقعیت روی نقشه به سبک اسنپ/نشان: پین وسط نقشه ثابته و کاربر نقشه رو زیرش جابه‌جا می‌کنه.
 * وقتی حرکت تموم شد (و کاربر ۰٫۴۵ ثانیه دست نگه داشت) onChange با مختصات مرکز صدا زده می‌شه.
 *
 * امکانات: جست‌وجوی آدرس، «موقعیت من» (با دایره‌ی دقت GPS)، زوم، لایه‌ی نقشه/ماهواره‌ای،
 * حالت تمام‌صفحه با دکمه‌ی تأیید و کارت «آدرس تقریبی» که هم‌زمان با جابه‌جایی پین به‌روز می‌شه.
 *
 * نکته‌های طراحی (نسبت به نسخه‌ی قبل):
 *  - حالت تمام‌صفحه به‌جای position:fixed داخل صفحه، به body منتقل می‌شه (بدون remount شدن نقشه)؛
 *    قبلاً هدر چسبون و BottomNav روی نقشه می‌افتادن و هر والدی با transform باعث خراب‌شدن fixed می‌شد.
 *  - دکمه‌ها و کارت‌ها دیگه با عددهای حدسی (bottom-[6.5rem]) جا نمی‌گیرن؛ توی یه ستون flex پایین نقشه
 *    می‌شینن و هیچ‌وقت روی هم نمی‌افتن.
 *  - ورودی جست‌وجو توی موبایل ۱۶px هست تا iOS موقع فوکوس صفحه رو زوم نکنه.
 *  - نسبت‌دهی (OSM/Esri) همیشه دیده می‌شه (قبلاً زیر کارت آدرس قایم می‌شد).
 *
 * پراپ‌های اختیاری برای کارت آدرس: addressPreview (متن) / addressLoading / addressNotFound.
 * اگه addressPreview پاس داده نشه (مثل پنل ادمین) کارت آدرس نشون داده نمی‌شه.
 * onLocateEnd(success, reason) — reason: denied | unavailable | timeout | unsupported | insecure
 *
 * لیفلت فقط سمت مرورگره، پس همه‌چیز توی useEffect ساخته می‌شه (با next/dynamic و ssr:false لود می‌شه).
 */
export default function MapPicker({
  value,
  onChange,
  onLocateStart,
  onLocateEnd,
  autoLocate = false,
  addressPreview,
  addressLoading = false,
  addressNotFound = false,
}) {
  const slotRef = useRef(null); // جای نقشه توی صفحه (ارتفاعش ثابته تا موقع تمام‌صفحه صفحه نپره)
  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const leafletRef = useRef(null);
  const meRef = useRef(null); // دایره‌ی دقت + نقطه‌ی «شما اینجایید»
  const meTimerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const onLocateEndRef = useRef(onLocateEnd);
  const lastEmittedRef = useRef(value?.lat != null ? { lat: value.lat, lng: value.lng } : null);
  const moveTimerRef = useRef(null);
  const suppressUntilRef = useRef(0); // تا این زمان moveend ها (مثل تغییر اندازه) آدرس نمی‌گیرن
  const autoLocateFiredRef = useRef(false);
  const searchSeqRef = useRef(0);
  const pendingFixRef = useRef(null); // اگه GPS زودتر از آماده‌شدن نقشه جواب داد، اینجا نگه می‌داریم

  // میزبان نقشه: یه div که یا توی slot می‌شینه یا به body منتقل می‌شه؛ React فقط داخلش پورتال می‌کنه
  const [host] = useState(() => {
    if (typeof document === "undefined") return null;
    const el = document.createElement("div");
    el.className = HOST_INLINE;
    el.dir = "rtl";
    return el;
  });

  const [locating, setLocating] = useState(false);
  const [ready, setReady] = useState(false);
  const [moving, setMoving] = useState(false);
  const [hasPoint, setHasPoint] = useState(value?.lat != null);
  const [fullscreen, setFullscreen] = useState(false);
  const [zoom, setZoom] = useState(value?.lat != null ? PIN_ZOOM : DEFAULT_ZOOM);
  const [accuracy, setAccuracy] = useState(null); // متر

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchDone, setSearchDone] = useState(false);

  const showCard = addressPreview !== undefined;

  useEffect(() => {
    onChangeRef.current = onChange;
    onLocateEndRef.current = onLocateEnd;
  }, [onChange, onLocateEnd]);

  // جابه‌جایی میزبان بین صفحه و body (باید قبل از ساخته‌شدن نقشه اجرا بشه، پس بالاتر از افکت لیفلت)
  useEffect(() => {
    const slot = slotRef.current;
    if (!host || !slot) return;
    if (fullscreen) {
      document.body.appendChild(host);
      host.className = HOST_FULL;
      host.style.pointerEvents = "auto"; // اگه روزی داخل دیالوگ Radix باز بشه، body غیرفعاله
    } else {
      slot.appendChild(host);
      host.className = HOST_INLINE;
      host.style.pointerEvents = "";
    }
    suppressUntilRef.current = Date.now() + 700; // تغییر اندازه نباید آدرس جدید بگیره
    const t = setTimeout(() => mapRef.current?.invalidateSize(), 60);
    return () => clearTimeout(t);
  }, [fullscreen, host]);

  // موقع از بین رفتن کامپوننت، میزبانِ چسبیده به body هم پاک بشه
  useEffect(() => () => host?.remove(), [host]);

  useEffect(() => {
    let cancelled = false;
    let map;

    import("leaflet").then((L) => {
      if (cancelled || !mapElRef.current || mapRef.current) return;
      leafletRef.current = L;

      const start = value?.lat != null ? [value.lat, value.lng] : DEFAULT_CENTER;
      map = L.map(mapElRef.current, {
        center: start,
        zoom: value?.lat != null ? PIN_ZOOM : DEFAULT_ZOOM,
        minZoom: 5,
        maxZoom: 19,
        maxBounds: IRAN_BOUNDS,
        maxBoundsViscosity: 0.8,
        zoomControl: false, // دکمه‌های بزرگ‌تر خودمون رو داریم
        attributionControl: false, // نسبت‌دهی رو خودمون پایین نقشه نشون می‌دیم (زیر کارت‌ها گم نشه)
        scrollWheelZoom: false, // تا وقتی روی نقشه کلیک نشده، اسکرول صفحه رو قفل نکنه
        zoomSnap: 0.5,
      });

      L.tileLayer(TILE_URL, { maxZoom: 19 }).addTo(map);

      map.on("click", () => map.scrollWheelZoom.enable());
      map.on("mouseout", () => map.scrollWheelZoom.disable());
      map.on("zoomend", () => setZoom(map.getZoom()));

      // وقتی کاربر خودش نقشه رو کشید، دایره‌ی دقت GPS دیگه معنی نداره
      map.on("dragstart", () => {
        clearTimeout(moveTimerRef.current);
        setMoving(true); // فقط موقع کشیدن/پرواز «در حال حرکت» حساب می‌شه، نه موقع زوم (کارت آدرس پرش نکنه)
        meRef.current?.remove();
        meRef.current = null;
        setAccuracy(null);
      });

      map.on("moveend", () => {
        setMoving(false);
        clearTimeout(moveTimerRef.current);
        if (Date.now() < suppressUntilRef.current) return;
        moveTimerRef.current = setTimeout(() => {
          const c = map.getCenter();
          const point = { lat: c.lat, lng: c.lng };
          if (metersBetween(lastEmittedRef.current, point) < MIN_MOVE_METERS) return;
          lastEmittedRef.current = point;
          setHasPoint(true);
          onChangeRef.current?.(point);
        }, MOVE_DEBOUNCE_MS);
      });

      mapRef.current = map;
      setReady(true);
    });

    return () => {
      cancelled = true;
      clearTimeout(moveTimerRef.current);
      clearTimeout(meTimerRef.current);
      map?.remove();
      mapRef.current = null;
      meRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // تمام‌صفحه: قفل اسکرول صفحه + بستن با Escape
  useEffect(() => {
    if (!fullscreen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && setFullscreen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [fullscreen]);

  function showMe(lat, lng, acc) {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    const brand = brandColor();
    meRef.current?.remove();
    const group = L.layerGroup();
    if (acc && acc < 5000) {
      L.circle([lat, lng], { radius: acc, color: brand, weight: 1, fillColor: brand, fillOpacity: 0.12, interactive: false }).addTo(group);
    }
    L.circleMarker([lat, lng], {
      radius: 7,
      color: "#fff",
      weight: 3,
      fillColor: brand,
      fillOpacity: 1,
      interactive: false,
    }).addTo(group);
    group.addTo(map);
    meRef.current = group;
    setAccuracy(acc ? Math.round(acc) : null);
  }

  // پرواز نرم به یک نقطه (moveend بعدش آدرس رو می‌گیره)
  function flyToPoint(lat, lng) {
    setMoving(true);
    mapRef.current?.flyTo([lat, lng], PIN_ZOOM, { duration: 0.7 });
  }

  function locateMe() {
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      onLocateEndRef.current?.(false, "insecure");
      return;
    }
    if (!navigator.geolocation) {
      onLocateEndRef.current?.(false, "unsupported");
      return;
    }
    setLocating(true);
    onLocateStart?.();
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy: acc } = pos.coords;
        if (!mapRef.current) {
          pendingFixRef.current = { lat, lng, acc };
          setLocating(false);
          onLocateEndRef.current?.(true);
          return;
        }
        flyToPoint(lat, lng);
        // دایره‌ی دقت بعد از پایان پرواز کشیده می‌شه (تا dragstart پاکش نکنه)
        clearTimeout(meTimerRef.current);
        meTimerRef.current = setTimeout(() => showMe(lat, lng, acc), 750);
        setLocating(false);
        onLocateEndRef.current?.(true);
      },
      (err) => {
        setLocating(false);
        onLocateEndRef.current?.(false, geoErrorReason(err));
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 },
    );
  }

  // اگه از بیرون خواسته شده بود، همین که نقشه آماده شد یه‌بار خودکار موقعیت کاربر رو بگیر
  useEffect(() => {
    if (autoLocate && !autoLocateFiredRef.current) {
      autoLocateFiredRef.current = true;
      locateMe();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLocate]);

  // نتیجه‌ی GPS که قبل از آماده‌شدن نقشه رسیده بود
  useEffect(() => {
    if (!ready || !pendingFixRef.current) return;
    const { lat, lng, acc } = pendingFixRef.current;
    pendingFixRef.current = null;
    flyToPoint(lat, lng);
    clearTimeout(meTimerRef.current);
    meTimerRef.current = setTimeout(() => showMe(lat, lng, acc), 750);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // جست‌وجوی آدرس (با تأخیر کوتاه بعد از تایپ)
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      setSearchDone(false);
      setSearching(false);
      return;
    }
    const seq = ++searchSeqRef.current;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const data = await api("GET", `/api/geo/search?q=${encodeURIComponent(q)}`);
        if (seq !== searchSeqRef.current) return;
        setResults(data.results ?? []);
      } catch {
        if (seq !== searchSeqRef.current) return;
        setResults([]);
      } finally {
        if (seq === searchSeqRef.current) {
          setSearching(false);
          setSearchDone(true);
        }
      }
    }, 600);
    return () => clearTimeout(t);
  }, [query]);

  function pickResult(r) {
    flyToPoint(r.lat, r.lng);
    setQuery("");
    setResults([]);
    setSearchDone(false);
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); // کیبورد موبایل بسته بشه
  }

  const showDropdown = query.trim().length >= 3 && (searching || searchDone);
  const busy = moving || locating;

  // متن کارت آدرس
  const cardTitle = "آدرس تقریبی نقطه‌ی انتخابی";
  let cardBody;
  if (!hasPoint && !addressPreview) cardBody = "پین را روی محل دقیق تحویل قرار دهید";
  else if (busy || addressLoading) cardBody = null; // اسکلت لودینگ
  else if (addressNotFound) cardBody = "برای این نقطه آدرسی پیدا نشد؛ اطلاعات را دستی کامل کنید";
  else cardBody = addressPreview || "نقشه را جابه‌جا کنید تا آدرس نمایش داده شود";

  // نکته‌ی راهنما (فقط وقتی لازمه، نه همیشه)
  let hint = null;
  if (!busy && !showDropdown) {
    if (accuracy != null) hint = `دقت GPS: حدود ${toFaDigits(String(accuracy))} متر`;
    else if (!hasPoint) hint = "نقشه را بکشید تا پین روی محل دقیق شما قرار بگیرد";
    else if (zoom < PRECISE_ZOOM) hint = "برای دقت بیشتر، نقشه را بزرگ‌نمایی کنید";
  }

  const ui = (
    <div
      // isolate = stacking context مستقل: z-indexهای داخلی نقشه (۴۵۰ تا ۸۰۰) دیگه روی هدر سایت و مودال‌ها نمی‌افتن
      className={cn("relative isolate z-0 h-full w-full overflow-hidden bg-slate-50", !fullscreen && "rounded-2xl border border-slate-200 shadow-sm")}
      role={fullscreen ? "dialog" : undefined}
      aria-modal={fullscreen ? true : undefined}
      aria-label={fullscreen ? "انتخاب موقعیت روی نقشه" : undefined}
    >
      {/* خودِ نقشه (داخل یه wrapper تا کلاس‌های position لیفلت با Tailwind دعوا نکنن) */}
      <div className="absolute inset-0">
        <div ref={mapElRef} className="h-full w-full" />
      </div>

      {!ready && (
        <div className="absolute inset-0 z-[800] flex flex-col items-center justify-center gap-2 bg-slate-50 text-xs text-slate-400">
          <Spinner className="text-green-700" />
          در حال بارگذاری نقشه...
        </div>
      )}

      {/* پین ثابت وسط نقشه: مبدأ مختصات = نوک پین. وقتی نقشه کشیده می‌شه پین بالا می‌پره و سایه‌ش کوچیک می‌شه */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-[450] h-0 w-0" aria-hidden="true">
        <span
          className={cn(
            "absolute left-0 top-0 h-1.5 w-4 -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-slate-900/35 blur-[2px] transition-all duration-200",
            moving && "scale-x-50 opacity-30",
          )}
        />
        {!moving && (
          <span
            key="settle"
            className="absolute left-0 top-0 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-600/25 motion-safe:animate-ping"
            style={{ animationDuration: "1.4s", animationIterationCount: 2 }}
          />
        )}
        <div
          className="absolute left-0 top-0 transition-transform duration-200 ease-out"
          style={{ transform: `translate(-50%, calc(-100% - ${moving ? 14 : 0}px))` }}
        >
          <svg width="40" height="52" viewBox="0 0 40 52" style={{ overflow: "visible" }} className="block drop-shadow-[0_6px_6px_rgb(15_23_42/0.28)]">
            <defs>
              <linearGradient id="map-pin-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" style={{ stopColor: "var(--color-green-500)" }} />
                <stop offset="1" style={{ stopColor: "var(--color-green-700)" }} />
              </linearGradient>
            </defs>
            <path
              d="M20 52C20 52 38.5 33.5 38.5 19.5C38.5 9.28 30.22 1 20 1C9.78 1 1.5 9.28 1.5 19.5C1.5 33.5 20 52 20 52Z"
              fill="url(#map-pin-fill)"
              stroke="#fff"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <circle cx="20" cy="19.5" r="7.5" fill="#fff" />
            <circle cx="20" cy="19.5" r="3" style={{ fill: "var(--color-green-700)" }} />
          </svg>
        </div>
      </div>

      {/* بالا: جست‌وجو (+ دکمه‌ی بستن در تمام‌صفحه) و نکته‌ی راهنما؛ z بالاتر از ریل دکمه‌ها تا لیست نتایج زیرش نره */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[700] flex flex-col gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-start gap-2">
          <div className="pointer-events-auto relative min-w-0 flex-1 sm:max-w-sm sm:flex-none sm:basis-96">
            <FaSearch size={13} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (results[0]) pickResult(results[0]); // Enter = اولین نتیجه
                } else if (e.key === "Escape" && query) {
                  e.stopPropagation(); // فقط جست‌وجو پاک بشه، تمام‌صفحه نبنده
                  setQuery("");
                }
              }}
              type="search"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              placeholder="جست‌وجوی خیابان، محله یا مکان..."
              aria-label="جست‌وجوی آدرس روی نقشه"
              className={cn(
                glass,
                "h-12 w-full rounded-2xl border-0 ps-11 pe-11 text-base text-slate-800 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-green-600/40 sm:text-[13px] [&::-webkit-search-cancel-button]:hidden",
              )}
            />
            {(query || searching) && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="پاک کردن جست‌وجو"
                className="absolute end-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                {searching ? <Spinner className="text-green-700" /> : <FaTimes size={11} />}
              </button>
            )}
            {showDropdown && (
              <ul
                role="listbox"
                className="absolute inset-x-0 top-[3.25rem] max-h-60 overflow-y-auto overscroll-contain rounded-2xl bg-white py-1.5 text-xs shadow-xl ring-1 ring-slate-900/5"
              >
                {results.map((r, i) => (
                  <li key={`${r.lat}-${r.lng}-${i}`} role="option" aria-selected="false">
                    <button
                      type="button"
                      onClick={() => pickResult(r)}
                      className="flex min-h-11 w-full items-start gap-2.5 px-3.5 py-2.5 text-start leading-5 text-slate-700 transition hover:bg-green-50"
                    >
                      <FaMapMarkerAlt size={12} className="mt-1 shrink-0 text-green-700" />
                      <span>{r.label}</span>
                    </button>
                  </li>
                ))}
                {!searching && results.length === 0 && (
                  <li className="px-3.5 py-3 text-slate-400">نتیجه‌ای پیدا نشد؛ عبارت دیگری امتحان کنید.</li>
                )}
              </ul>
            )}
          </div>

          {fullscreen && (
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              aria-label="بستن نقشه تمام‌صفحه"
              className={cn(ctrlBtn, "pointer-events-auto h-12 w-12 shrink-0")}
            >
              <FaTimes size={14} />
            </button>
          )}
        </div>

        {hint && (
          <div className="pointer-events-none self-center rounded-full bg-slate-900/80 px-3.5 py-1.5 text-center text-[11px] leading-5 text-white shadow-lg backdrop-blur">
            {hint}
          </div>
        )}
      </div>

      {/* ریل کنترل‌ها: یک ستون واحد کنار نقشه (زوم ← لایه ← تمام‌صفحه)، زیر نوار جست‌وجو و بالای کارت پایین */}
      <div
        dir="ltr"
        className="pointer-events-none absolute right-3 top-[max(4.75rem,calc(env(safe-area-inset-top)+4rem))] z-[650] flex flex-col items-end gap-2"
      >
        {/* زوم فقط روی دسکتاپ؛ توی موبایل با دو انگشت (pinch) زوم می‌شه */}
        <div className={cn(glass, "pointer-events-auto flex flex-col overflow-hidden rounded-2xl max-sm:hidden")}>
          <button type="button" onClick={() => mapRef.current?.zoomIn()} aria-label="بزرگ‌نمایی" title="بزرگ‌نمایی" className={railBtn}>
            <FaPlus size={13} />
          </button>
          <span className="mx-2 h-px bg-slate-200" />
          <button type="button" onClick={() => mapRef.current?.zoomOut()} aria-label="کوچک‌نمایی" title="کوچک‌نمایی" className={railBtn}>
            <FaMinus size={13} />
          </button>
        </div>
        <div className={cn(glass, "pointer-events-auto flex flex-col overflow-hidden rounded-2xl")}>
          <button
            type="button"
            onClick={() => setFullscreen((f) => !f)}
            aria-label={fullscreen ? "خروج از تمام‌صفحه" : "نقشه تمام‌صفحه"}
            title={fullscreen ? "خروج از تمام‌صفحه" : "نقشه تمام‌صفحه"}
            className={railBtn}
          >
            {fullscreen ? <FaCompress size={13} /> : <FaExpand size={13} />}
          </button>
        </div>
      </div>

      {/* پایین: «موقعیت من» ← کارت آدرس ← تأیید ← نسبت‌دهی؛ همه توی یه ستون flex و بدون هم‌پوشانی */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[600] flex flex-col gap-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={locateMe}
          disabled={locating}
          aria-label="موقعیت من"
          className="pointer-events-auto inline-flex h-11 items-center gap-2 self-start rounded-2xl bg-linear-to-b from-green-600 to-green-700 px-4 text-xs font-bold text-white shadow-lg shadow-green-900/25 transition hover:from-green-700 hover:to-green-800 active:scale-95 disabled:opacity-80 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-600/30"
        >
          {locating ? <Spinner /> : <FaCrosshairs size={14} />}
          {locating ? "در حال یافتن موقعیت..." : "موقعیت من"}
        </button>

        {showCard && (
          <div
            className={cn(glass, "pointer-events-auto flex items-center gap-3 rounded-2xl p-3 sm:mx-auto sm:w-full sm:max-w-md")}
            aria-live="polite"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700">
              <FaMapMarkerAlt size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-slate-500">{cardTitle}</p>
              {cardBody === null ? (
                <div className="mt-1.5 space-y-1.5">
                  <div className="h-2.5 w-4/5 animate-pulse rounded-full bg-slate-200" />
                  <div className="h-2.5 w-3/5 animate-pulse rounded-full bg-slate-200" />
                </div>
              ) : (
                <p className="line-clamp-2 text-xs font-bold leading-5 text-slate-800">{cardBody}</p>
              )}
            </div>
          </div>
        )}

        {fullscreen && (
          <button
            type="button"
            onClick={() => setFullscreen(false)}
            className="pointer-events-auto inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-b from-green-600 to-green-700 text-sm font-bold text-white shadow-lg shadow-green-900/25 transition hover:from-green-700 hover:to-green-800 active:scale-[0.98] sm:mx-auto sm:max-w-md"
          >
            <FaCheck size={13} />
            تأیید موقعیت
          </button>
        )}

        {/* نسبت‌دهی نقشه (طبق مجوز OSM/Esri باید همیشه دیده بشه) */}
        <div
          dir="ltr"
          className="pointer-events-auto self-end rounded-full bg-white/80 px-2.5 py-0.5 text-[10px] leading-4 text-slate-500 backdrop-blur [&_a]:text-green-700"
          dangerouslySetInnerHTML={{ __html: TILE_ATTRIBUTION }}
        />
      </div>
    </div>
  );

  return (
    <div ref={slotRef} className="h-[26rem] sm:h-[30rem]">
      {host && createPortal(ui, host)}
    </div>
  );
}
