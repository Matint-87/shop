"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaHome, FaRedoAlt, FaShoppingBasket } from "react-icons/fa";
import ErrorScene from "@/components/ErrorScene";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * صفحه‌ی خطای عمومی: هر خطای پیش‌بینی‌نشده‌ی داخل صفحه‌ها (سرور یا کلاینت) به‌جای صفحه‌ی سفید اینجا نشون داده می‌شه.
 * پیام فنیِ خطا عمداً نشون داده نمی‌شه (ممکنه اطلاعات داخلی لو بده)؛ فقط «کد پیگیری» (digest) برای پیدا کردن لاگ سرور.
 */
export default function Error({ error, reset, unstable_retry }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    console.error(error);
  }, [error]);

  function retry() {
    startTransition(() => {
      if (typeof unstable_retry === "function") {
        unstable_retry();
      } else {
        router.refresh(); // دوباره از سرور بگیر
        reset(); // و دوباره رندر کن
      }
    });
  }

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 font-sans text-slate-800">
      {/* نوار ساده‌ی بالا (هدر اصلی سروریه و داخل مرز خطا نمی‌تونه باشه) */}
      <header className="border-b border-slate-200/80 bg-slate-50/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center px-4 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-linear-to-br from-green-500 to-green-700 text-white shadow-brand">
              <FaShoppingBasket size={20} />
            </span>
            <span className="text-lg font-extrabold tracking-tight text-green-800">سوپرمارکت رحیمی</span>
          </Link>
        </div>
      </header>

      <ErrorScene
        variant="error"
        title="یه مشکل پیش اومد"
        description="متأسفانه موقع نمایش این صفحه خطایی رخ داد. این مشکل از طرف شماست نیست. یه بار دوباره امتحان کنید؛ اگه حل نشد، چند دقیقه‌ی دیگه سر بزنید."
        note={error?.digest ? `کد پیگیری: ${error.digest}` : undefined}
      >
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={retry} disabled={pending} className={cn(buttonVariants({ size: "default" }), "flex")}>
            <FaRedoAlt size={13} className={pending ? "motion-safe:animate-spin" : undefined} />
            {pending ? "در حال تلاش…" : "تلاش دوباره"}
          </button>
          <Link href="/" className={cn(buttonVariants({ variant: "outline", size: "default" }), "flex")}>
            <FaHome size={14} />
            صفحه‌ی اصلی
          </Link>
        </div>
      </ErrorScene>
    </div>
  );
}
