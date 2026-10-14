import Link from "next/link";
import { FaLock, FaShoppingBasket } from "react-icons/fa";

/** قاب مشترک صفحه‌های ورود/تکمیل اطلاعات: لوگو + کارت وسط صفحه.
 *  دکمه‌ی بازگشت داخل خودِ کارت فرم‌ها قرار می‌گیره (BackButton variant="inline"). */
export default function AuthShell({ children, wide = false }) {
  return (
    <div className="relative min-h-dvh bg-slate-50 font-sans text-slate-800">
      {/* یک لایه‌ی رنگی ملایم بالای صفحه؛ با تغییر پالت سایت خودکار عوض می‌شه */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-linear-to-b from-green-100/70 to-transparent" />
      <div className={`relative mx-auto w-full px-4 py-6 sm:py-10 ${wide ? "max-w-2xl" : "max-w-md"}`}>
        <Link href="/" className="mb-6 flex items-center justify-center gap-2.5">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-green-500 to-green-700 text-white shadow-brand">
            <FaShoppingBasket size={22} />
          </span>
          <span className="text-xl font-extrabold tracking-tight text-green-800">سوپرمارکت رحیمی</span>
        </Link>
        {children}
        <p className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <FaLock size={10} aria-hidden="true" />
          اطلاعات شما فقط برای ثبت و ارسال سفارش استفاده می‌شود.
        </p>
      </div>
    </div>
  );
}
