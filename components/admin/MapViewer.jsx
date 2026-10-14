"use client";

import { useEffect, useRef, useState } from "react";
import { FaCrosshairs, FaMinus, FaPlus } from "react-icons/fa";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";

const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';
const VIEW_ZOOM = 16;

const glass = "bg-white/95 backdrop-blur-md shadow-lg shadow-slate-900/10 ring-1 ring-slate-900/5";
const ctrlBtn =
  "flex h-10 w-10 items-center justify-center text-slate-700 transition hover:bg-green-50 hover:text-green-700 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-600/25";

// آیکن پین با حلقه‌ی ضربان. نوک پین دقیقاً روی مختصاته (iconAnchor)؛
// نسخه‌ی قبل یه translateY(-100%) اضافه داشت و پین حدود ۴۴ پیکسل بالاتر از نقطه‌ی واقعی می‌نشست.
function pinIcon(L) {
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:40px;height:52px">
      <span class="map-pin-pulse"></span>
      <svg width="40" height="52" viewBox="0 0 40 52" xmlns="http://www.w3.org/2000/svg" style="display:block;position:relative;overflow:visible;filter:drop-shadow(0 6px 6px rgb(15 23 42 / .28))">
        <defs><linearGradient id="mv-pin-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--color-green-500)"/><stop offset="1" style="stop-color:var(--color-green-700)"/></linearGradient></defs>
        <path d="M20 52C20 52 38.5 33.5 38.5 19.5C38.5 9.28 30.22 1 20 1C9.78 1 1.5 9.28 1.5 19.5C1.5 33.5 20 52 20 52Z" fill="url(#mv-pin-fill)" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>
        <circle cx="20" cy="19.5" r="7.5" fill="#fff"/>
        <circle cx="20" cy="19.5" r="3" style="fill:var(--color-green-700)"/>
      </svg></div>`,
    iconSize: [40, 52],
    iconAnchor: [20, 52],
  });
}

/**
 * نقشه‌ی فقط‌نمایشی با یک پین (برای دیدن موقعیت انتخابی کاربر در پنل مدیریت).
 * با next/dynamic و ssr:false لود بشه.
 * امکانات: زوم، نمای نقشه/ماهواره، برگشت به پین. وقتی داخل مودال باز می‌شه (که انیمیشن داره) با
 * ResizeObserver اندازه رو دوباره می‌سنجه تا کاشی‌ها خاکستری/جابه‌جا نمونن. تغییر lat/lng نقشه رو از نو نمی‌سازه.
 */
export default function MapViewer({ lat, lng, className = "h-72 sm:h-80" }) {
  const wrapRef = useRef(null);
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const posRef = useRef({ lat, lng });
  const [ready, setReady] = useState(false);

  posRef.current = { lat, lng };

  // ساخت نقشه (فقط یک‌بار)
  useEffect(() => {
    let cancelled = false;
    let map;
    let ro;
    import("leaflet").then((L) => {
      if (cancelled || !elRef.current || mapRef.current) return;
      map = L.map(elRef.current, {
        center: [posRef.current.lat, posRef.current.lng],
        zoom: VIEW_ZOOM,
        minZoom: 3,
        maxZoom: 19,
        scrollWheelZoom: false,
        zoomControl: false,
        attributionControl: false,
      });
      L.control.attribution({ prefix: false, position: "bottomleft" }).addTo(map);
      L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);
      markerRef.current = L.marker([posRef.current.lat, posRef.current.lng], { icon: pinIcon(L), interactive: false }).addTo(map);
      map.on("click", () => map.scrollWheelZoom.enable());
      map.on("mouseout", () => map.scrollWheelZoom.disable());

      // اندازه‌ی کانتینر (مثلاً بعد از انیمیشن باز شدن مودال) عوض شد → نقشه بازمحاسبه بشه
      if (typeof ResizeObserver !== "undefined" && wrapRef.current) {
        ro = new ResizeObserver(() => map.invalidateSize());
        ro.observe(wrapRef.current);
      }
      mapRef.current = map;
      setReady(true);
    });
    return () => {
      cancelled = true;
      ro?.disconnect();
      map?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // اگه مختصات عوض شد، فقط پین و دید نقشه جابه‌جا بشه
  useEffect(() => {
    if (!ready) return;
    markerRef.current?.setLatLng([lat, lng]);
    mapRef.current?.setView([lat, lng], mapRef.current.getZoom());
  }, [lat, lng, ready]);

  return (
    <div
      ref={wrapRef}
      className={cn("relative isolate z-0 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm", className)}
    >
      {/* wrapper لازمه: لیفلت به عنصر خودش position:relative می‌ده و absolute/inset-0 تیلویند رو باطل می‌کنه
          (ارتفاع نقشه صفر می‌شد و نقشه، پین و نسبت‌دهی دیده نمی‌شدن) */}
      <div className="absolute inset-0">
        <div ref={elRef} className="h-full w-full" />
      </div>

      {!ready && (
        <div className="absolute inset-0 z-[800] flex items-center justify-center bg-slate-50 text-xs text-slate-400">
          در حال بارگذاری نقشه...
        </div>
      )}

      {/* کنترل‌ها (راست‌پایین؛ نسبت‌دهی لیفلت چپ‌پایین می‌مونه) */}
      <div dir="ltr" className="pointer-events-none absolute bottom-3 right-3 z-[700] flex flex-col gap-2">
        <div className={cn(glass, "pointer-events-auto flex flex-col overflow-hidden rounded-2xl max-sm:hidden")}>
          <button type="button" onClick={() => mapRef.current?.zoomIn()} aria-label="بزرگ‌نمایی" className={ctrlBtn}>
            <FaPlus size={12} />
          </button>
          <span className="mx-2 h-px bg-slate-200" />
          <button type="button" onClick={() => mapRef.current?.zoomOut()} aria-label="کوچک‌نمایی" className={ctrlBtn}>
            <FaMinus size={12} />
          </button>
        </div>
        <button
          type="button"
          onClick={() => mapRef.current?.flyTo([lat, lng], VIEW_ZOOM, { duration: 0.6 })}
          aria-label="برگشت به محل پین"
          title="برگشت به محل پین"
          className={cn(glass, ctrlBtn, "pointer-events-auto rounded-2xl")}
        >
          <FaCrosshairs size={13} />
        </button>
      </div>
    </div>
  );
}
