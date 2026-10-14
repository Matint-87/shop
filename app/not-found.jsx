import Link from "next/link";
import { FaHome, FaShoppingBasket, FaShoppingCart, FaQuestionCircle, FaPhoneAlt } from "react-icons/fa";
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
        description="انگار این آدرس وجود نداره یا جابه‌جا و حذف شده. نگران نباشید، می‌تونید به صفحه‌ی اصلی برگردید یا از لینک‌های زیر ادامه بدید."
      >
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
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
