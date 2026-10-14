import { FaBirthdayCake } from "react-icons/fa";
import { describeBirthDate } from "@/lib/jalali";

/**
 * ردیف «تاریخ تولد» در اطلاعات حساب: تاریخ شمسی به‌صورت راست‌به‌چپ (روز ماه سال)، آیکن کیک،
 * سن به‌صورت نشان کوچک، و تبریک اگه امروز تولد کاربر باشه.
 * (قبلاً مقدار با dir="ltr" نمایش داده می‌شد و ترتیب «روز ماه سال» وارونه دیده می‌شد.)
 */
export default function BirthDateRow({ value }) {
  const info = value ? describeBirthDate(value) : null;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 text-sm last:border-0">
      <span className="text-slate-500">تاریخ تولد</span>
      {info ? (
        <span className="flex flex-wrap items-center justify-end gap-2">
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
            <FaBirthdayCake size={13} aria-hidden="true" className="text-green-600" />
            <time dateTime={value}>{info.text}</time>
          </span>
          {info.ageText && (
            <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-bold text-green-700">{info.ageText}</span>
          )}
          {info.isBirthday && (
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700">تولدتان مبارک 🎉</span>
          )}
        </span>
      ) : (
        <span className="font-medium text-slate-800">—</span>
      )}
    </div>
  );
}
