"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { FaCheck, FaCopy, FaDirections, FaExternalLinkAlt, FaMapMarkerAlt } from "react-icons/fa";
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
 * مودال: نقشه با پین + متن آدرس + مسیریابی (گوگل مپ) / OSM / کپی مختصات.
 */
export default function AddressMapButton({ address, title = "موقعیت آدرس روی نقشه" }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { latitude: lat, longitude: lng } = address;
  if (lat == null || lng == null) {
    return <span className="text-[11px] text-slate-400">بدون موقعیت نقشه</span>;
  }
  const coordText = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

  async function copyCoords() {
    try {
      await navigator.clipboard.writeText(coordText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // کلیپ‌بورد در دسترس نیست (http یا مرورگر قدیمی)؛ کاری نمی‌کنیم
    }
  }

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
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
              target="_blank"
              rel="noreferrer"
              className={linkCls}
            >
              <FaDirections size={12} /> مسیریابی با گوگل مپ
            </a>
            <a
              href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`}
              target="_blank"
              rel="noreferrer"
              className={linkCls}
            >
              OpenStreetMap <FaExternalLinkAlt size={9} />
            </a>
            <button type="button" onClick={copyCoords} className={`${linkCls} col-span-2`} aria-live="polite">
              {copied ? <FaCheck size={11} className="text-green-700" /> : <FaCopy size={11} />}
              <span dir="ltr">{copied ? "کپی شد" : coordText}</span>
            </button>
          </div>
        </div>
      </FormModal>
    </>
  );
}
