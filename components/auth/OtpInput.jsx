"use client";

import { useEffect, useRef, useState } from "react";
import { toEnglishDigits } from "@/lib/phone";
import { OTP_LENGTH } from "@/lib/auth-constants";

/**
 * ورودی کد تأیید: یک input واقعی (شفاف) + خانه‌های نمایشی.
 * چون فقط یک input داریم، پر شدن خودکار پیامک (iOS/Android)، paste و ارقام فارسی بدون دردسر کار می‌کنن.
 */
export default function OtpInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  hasError = false,
  length = OTP_LENGTH,
  autoFocus = true,
}) {
  const ref = useRef(null);
  const [focused, setFocused] = useState(false);

  // وقتی input موقع «در حال بررسی» disabled می‌شه، فوکوس رو از دست می‌ده؛ بعد از خطا کاربر باید دوباره بزنه روش.
  // اینجا بعد از تموم‌شدن درخواست فوکوس برمی‌گرده تا بشه بلافاصله کد جدید رو تایپ کرد.
  const wasDisabled = useRef(false);
  useEffect(() => {
    if (wasDisabled.current && !disabled) ref.current?.focus();
    wasDisabled.current = disabled;
  }, [disabled]);

  function handleChange(e) {
    const digits = toEnglishDigits(e.target.value).replace(/\D/g, "").slice(0, length);
    onChange(digits);
    if (digits.length === length) onComplete?.(digits);
  }

  const activeIndex = Math.min(value.length, length - 1);

  return (
    <div className="relative" dir="ltr" onClick={() => ref.current?.focus()}>
      {/* با key عوض‌شدنِ hasError، انیمیشن لرزش هر بار که خطا تازه رخ می‌ده دوباره اجرا می‌شه */}
      <div key={hasError ? "err" : "ok"} className={`flex justify-center gap-2 ${hasError ? "otp-shake" : ""}`} aria-hidden="true">
        {Array.from({ length }, (_, i) => {
          const isActive = focused && i === activeIndex && !disabled;
          const filled = Boolean(value[i]);
          return (
            <div
              key={i}
              className={`relative flex h-14 w-11 items-center justify-center rounded-2xl border-2 text-2xl font-extrabold tabular-nums transition sm:h-16 sm:w-13 ${
                i === Math.floor(length / 2) ? "ml-2" : ""
              } ${
                hasError
                  ? "border-red-400 bg-red-50/60 text-red-700"
                  : isActive
                    ? "border-green-600 bg-white text-slate-800 ring-4 ring-green-600/15"
                    : filled
                      ? "border-green-600/40 bg-green-50/70 text-slate-800"
                      : "border-slate-200 bg-white text-slate-800"
              } ${disabled ? "opacity-60" : ""}`}
            >
              {value[i] ?? ""}
              {isActive && !filled && <span className="absolute h-6 w-0.5 animate-pulse rounded-full bg-green-600" />}
            </div>
          );
        })}
      </div>
      <input
        ref={ref}
        value={value}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={disabled}
        autoFocus={autoFocus}
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label="کد تأیید"
        aria-invalid={hasError}
        className="absolute inset-0 h-full w-full cursor-text opacity-0"
      />
    </div>
  );
}
