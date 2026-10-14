"use client";

import "./globals.css";
import { useEffect } from "react";
import { FaHome, FaRedoAlt } from "react-icons/fa";
import ErrorScene from "@/components/ErrorScene";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

/**
 * آخرین خط دفاع: وقتی خود layout ریشه خطا بده (و error.jsx کار نکنه) این صفحه جای کل صفحه می‌شینه.
 * چون layout جایگزین می‌شه، <html> و <body> رو خودش داره. از <a> ساده استفاده شده (نه next/link)
 * تا کلیک، صفحه رو کامل از اول لود کنه و از حالت خراب بیرون بیاد.
 */
export default function GlobalError({ error }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const btn =
    "inline-flex h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-bold transition-all active:scale-[0.98]";

  return (
    <html lang="fa" dir="rtl" className="font-sans" suppressHydrationWarning>
      <head>
        <title>خطا | سوپرمارکت رحیمی</title>
        <meta name="robots" content="noindex" />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-dvh flex-col font-sans text-slate-800">
        <ErrorScene
          variant="error"
          title="سایت موقتاً با مشکل روبه‌رو شده"
          description="یه خطای غیرمنتظره رخ داد. صفحه رو دوباره بارگذاری کنید؛ اگه حل نشد، چند دقیقه‌ی دیگه سر بزنید."
          note={error?.digest ? `کد پیگیری: ${error.digest}` : undefined}
        >
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className={`${btn} bg-linear-to-b from-green-600 to-green-700 text-white shadow-brand hover:from-green-700 hover:to-green-800`}
            >
              <FaRedoAlt size={13} />
              بارگذاری دوباره
            </button>
            <a href="/" className={`${btn} border border-green-600/40 bg-white text-green-700 hover:bg-green-50`}>
              <FaHome size={14} />
              صفحه‌ی اصلی
            </a>
          </div>
        </ErrorScene>
      </body>
    </html>
  );
}
