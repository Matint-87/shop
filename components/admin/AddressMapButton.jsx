"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { FaDirections, FaMapMarkerAlt } from "react-icons/fa";
import FormModal from "@/components/admin/FormModal";
import { toFaDigits } from "@/lib/phone";

const MapViewer = dynamic(() => import("./MapViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-xs text-slate-400 sm:h-80">
      در حال بارگذاری نقشه...
    </div>
  ),
});

/** آدرس کامل به‌صورت یک متن، برای نمایش در مودال */
export function addressText(a) {
  return [
    a.province,
    a.city,
    a.neighborhood,
    a.addressLine,
    a.plaque ? `پلاک ${toFaDigits(a.plaque)}` : "",
    a.unit ? `واحد ${toFaDigits(a.unit)}` : "",
  ]
    .filter(Boolean)
    .join("، ");
}

const linkCls =
  "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-2 text-xs font-medium text-slate-700 transition hover:bg-green-50 hover:text-green-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-600/20";

/**
 * دکمه‌ی «مشاهده روی نقشه»؛ اگه آدرس مختصات نداشته باشه (آدرس‌های قدیمی که دستی ثبت شدن) چیزی نشون نمی‌ده.
 * مودال: نقشه با پین + متن آدرس + مسیریابی با گوگل مپ / نشان / بلد.
 * مقصد = مختصات آدرس تحویل، مبدأ = موقعیت فعلی کسی که مودال رو باز کرده (GPS مرورگر).
 */
export default function AddressMapButton({ address, title = "موقعیت آدرس روی نقشه" }) {
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState(null); // موقعیت فعلی کاربر: { lat, lng } یا null
  const { latitude: lat, longitude: lng } = address;
  const hasPoint = lat != null && lng != null;

  // با باز شدن مودال موقعیت فعلی گرفته می‌شه تا لینک‌های نشان/بلد مبدأ داشته باشن.
  // لینک‌ها <a> ساده‌ان (نه window.open بعد از کار async) تا مرورگر پاپ‌آپ‌شون رو نبنده.
  useEffect(() => {
    if (!open || !hasPoint || typeof navigator === "undefined" || !navigator.geolocation) return;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!cancelled) setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        // دسترسی رد شد یا GPS در دسترس نیست؛ لینک‌ها بدون مبدأ می‌مونن
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
    return () => {
      cancelled = true;
    };
  }, [open, hasPoint]);

  if (!hasPoint) {
    return <span className="text-[11px] text-slate-400">بدون موقعیت نقشه</span>;
  }

  const dest = `${lat},${lng}`;
  const from = origin ? `${origin.lat},${origin.lng}` : null;
  // گوگل: بدون origin خودش از موقعیت فعلی شروع می‌کنه
  const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
  // نشان و بلد: لینک مسیر با مبدأ و مقصد (lat,lng)؛ اگه موقعیت کاربر نیومده بود، فقط نقطه‌ی مقصد باز می‌شه
  const neshanUrl = from
    ? `https://nshn.ir/?origin=${from}&destination=${dest}&vehicle=d`
    : `https://nshn.ir/?lat=${lat}&lng=${lng}`;
  const baladUrl = from
    ? `https://balad.ir/route?origin=${from}&destination=${dest}`
    : `https://balad.ir/location?latitude=${lat}&longitude=${lng}#17.00/${lat}/${lng}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-8 items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-[11px] font-medium text-green-700 transition hover:bg-green-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-600/20"
      >
        <FaMapMarkerAlt size={10} />
        مشاهده روی نقشه
      </button>
      <FormModal open={open} onClose={() => setOpen(false)} title={title} size="lg">
        {open && <MapViewer lat={lat} lng={lng} className="h-80 sm:h-96" />}
        <div className="space-y-3">
          <p className="rounded-xl bg-slate-50 px-3.5 py-3 text-xs leading-6 text-slate-700">{addressText(address)}</p>
          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <a href={googleUrl} target="_blank" rel="noreferrer" className={linkCls}>
              <FaDirections size={12} /> مسیریابی با گوگل مپ
            </a>
            <a href={neshanUrl} target="_blank" rel="noreferrer" className={linkCls}>
              <FaDirections size={12} /> مسیریابی با نشان
            </a>
            <a href={baladUrl} target="_blank" rel="noreferrer" className={linkCls}>
              <FaDirections size={12} /> مسیریابی با بلد
            </a>
          </div>
        </div>
      </FormModal>
    </>
  );
}
