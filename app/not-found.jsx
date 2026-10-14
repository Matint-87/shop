import Link from "next/link";
import { FaHome, FaSearch, FaShoppingBasket, FaShoppingCart, FaQuestionCircle, FaPhoneAlt } from "react-icons/fa";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";
import ErrorScene from "@/components/ErrorScene";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "صفحه پیدا نشد", robots: { index: false, follow: false } };

// لینک‌های میان‌بُر زیر دکمه‌ها
const QUICK_LINKS = [
  { href: "/products", label: "همه‌ی محصولات", Icon: FaShoppingBasket },
  { href: "/cart", label: "سبد خرید", Icon: FaShoppingCart },
  { href: "/faq", label: "سؤالات متداول", Icon: FaQuestionCircle },
  { href: "/contact", label: "تماس با ما", Icon: FaPhoneAlt },
];

/** صفحه‌ی ۴۰۴ برای کل سایت (هر آدرسی که وجود نداشته باشه یا notFound() صدا زده بشه) */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 font-sans text-slate-800">
      <Header />

      <ErrorScene
        variant="notfound"
        title="این صفحه گم شده!"
        description="انگار این آدرس وجود نداره یا جابه‌جا و حذف شده. نگران نباشید، می‌تونید از همین‌جا دنبال چیزی که می‌خواید بگردید یا به صفحه‌ی اصلی برگردید."
      >
        {/* جستجوی ساده (بدون جاوااسکریپت) → /products?q=... */}
        <form
          action="/products"
          method="get"
          role="search"
          className="mx-auto mt-6 flex max-w-sm items-center gap-1 rounded-full border border-slate-200 bg-white p-1.5 shadow-soft transition focus-within:border-green-500 focus-within:ring-4 focus-within:ring-green-600/15"
        >
          <FaSearch aria-hidden="true" className="mx-3 shrink-0 text-slate-400" size={14} />
          <input
            name="q"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            aria-label="جستجوی محصول"
            placeholder="دنبال چی می‌گردید؟"
            className="min-w-0 flex-1 bg-transparent py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400"
          />
          <button type="submit" className={cn(buttonVariants({ size: "sm" }), "px-5")}>
            جستجو
          </button>
        </form>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className={cn(buttonVariants({ size: "default" }), "flex")}>
            <FaHome size={14} />
            بازگشت به صفحه‌ی اصلی
          </Link>
        </div>

        <ul className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {QUICK_LINKS.map(({ href, label, Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3.5 py-2 text-xs font-bold text-slate-600 transition hover:-translate-y-0.5 hover:border-green-500/50 hover:text-green-700 hover:shadow-soft"
              >
                <Icon size={12} className="text-green-600 transition-transform group-hover:scale-125" aria-hidden="true" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </ErrorScene>

      <Footer />
      <BottomNav />
    </div>
  );
}
