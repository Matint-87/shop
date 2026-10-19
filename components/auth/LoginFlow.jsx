"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaCheck, FaEye, FaEyeSlash, FaKey, FaLock, FaMobileAlt, FaShieldAlt, FaSms } from "react-icons/fa";
import BackButton from "@/components/BackButton";
import { api } from "@/lib/api-client";
import { OTP_LENGTH, OTP_MAX_PER_DAY, OTP_RESEND_SECONDS, OTP_TTL_SECONDS } from "@/lib/auth-constants";
import { normalizeMobile, toEnglishDigits, toFaDigits } from "@/lib/phone";
import { checkPassword } from "@/lib/validators";
import { Alert, Field, Spinner, btnPrimary, btnSecondary } from "@/components/ui/form";
import { IconInput } from "@/components/ui/form-extras";
import { StepHeader, StepPane, StepProgress } from "./AuthUi";
import { notify, useToastOnChange } from "@/lib/toast";
import { useAuth } from "./AuthProvider";
import OtpInput from "./OtpInput";

/** ثانیه → «۰۲:۴۵» با ارقام فارسی */
function formatClock(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const sec = totalSeconds % 60;
  return toFaDigits(`${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`);
}

// مراحل ثبت‌نام / بازیابی رمز (بعد از این‌ها کاربر وارد «تکمیل اطلاعات» می‌شه)
const JOURNEY = [
  { key: "phone", label: "شماره موبایل", icon: FaMobileAlt },
  { key: "otp", label: "کد تأیید", icon: FaShieldAlt },
  { key: "password", label: "رمز عبور", icon: FaLock },
];

// قوانین رمز (همون قوانین checkPassword) برای نمایش زنده‌ی قدرت رمز
function passwordRules(pw) {
  return [
    { ok: pw.length >= 8, label: "حداقل ۸ کاراکتر" },
    { ok: /\p{L}/u.test(pw), label: "یک حرف" },
    { ok: /\d/.test(toEnglishDigits(pw)), label: "یک عدد" },
  ];
}
const STRENGTH = [
  { label: "", bar: "bg-slate-200", text: "text-slate-400" },
  { label: "ضعیف", bar: "bg-red-500", text: "text-red-600" },
  { label: "ضعیف", bar: "bg-amber-500", text: "text-amber-600" },
  { label: "قابل قبول", bar: "bg-green-600", text: "text-green-700" },
  { label: "قوی", bar: "bg-emerald-500", text: "text-emerald-600" },
];

// phone → (password) یا (otp → setPassword)
export default function LoginFlow({ next = "/" }) {
  const router = useRouter();
  const { user, loading: authLoading, setUser } = useAuth();
  const finishing = useRef(false);

  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
  const [purpose, setPurpose] = useState("LOGIN"); // هدف OTP: ورود/ثبت‌نام یا فراموشی رمز
  const [isNew, setIsNew] = useState(false);
  const [resendAt, setResendAt] = useState(0); // زمانی که دکمه‌ی «ارسال مجدد» فعال می‌شه
  const [expireAt, setExpireAt] = useState(0); // زمانی که کد منقضی می‌شه
  const [dayLimited, setDayLimited] = useState(false); // سقف ۱۰ بار در روز تمام شده؟
  const [devCode, setDevCode] = useState(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  useToastOnChange(error); // خطای کلی به‌صورت toast نشون داده می‌شه (خطای زیر هر فیلد همون‌جا می‌مونه)
  const [fieldError, setFieldError] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const afterLoginPath = (u) =>
    u.profileCompleted ? next : `/complete-profile?next=${encodeURIComponent(next)}`;

  // کاربری که از قبل وارد شده نباید صفحه‌ی ورود رو ببینه
  useEffect(() => {
    if (!authLoading && user && !finishing.current) router.replace(afterLoginPath(user));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  // شمارنده‌ی «ارسال مجدد کد»
  useEffect(() => {
    if (step !== "otp") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [step]);

  const secondsLeft = Math.max(0, Math.ceil((resendAt - now) / 1000)); // تا ارسال مجدد
  const expiresLeft = Math.max(0, Math.ceil((expireAt - now) / 1000)); // تا انقضای کد

  function resetMessages() {
    setError("");
    setFieldError("");
  }

  function goBackToPhone() {
    resetMessages();
    setCode("");
    setPassword("");
    setConfirm("");
    setStep("phone");
  }

  function beginOtp(data) {
    resetMessages();
    setPurpose(data.purpose ?? "LOGIN");
    setIsNew(Boolean(data.isNew));
    setResendAt(Date.now() + (data.resendIn ?? OTP_RESEND_SECONDS) * 1000);
    setExpireAt(Date.now() + (data.expiresIn ?? OTP_TTL_SECONDS) * 1000);
    setDayLimited(false);
    setNow(Date.now());
    setDevCode(data.devCode ?? null);
    setCode("");
    setStep("otp");
  }

  function finish(loggedInUser) {
    finishing.current = true;
    notify.success("با موفقیت وارد شدید.");
    setUser(loggedInUser);
    router.replace(afterLoginPath(loggedInUser));
  }

  async function run(fn) {
    setBusy(true);
    resetMessages();
    try {
      await fn();
    } catch (err) {
      setError(err.message);
      return err;
    } finally {
      setBusy(false);
    }
  }

  // ───── قدم ۱: شماره ─────
  function submitPhone(e) {
    e.preventDefault();
    const normalized = normalizeMobile(phone);
    if (!normalized) {
      setFieldError("شماره موبایل معتبر نیست (مثال: ۰۹۱۲۳۴۵۶۷۸۹)");
      return;
    }
    run(async () => {
      const data = await api("POST", "/api/auth/start", { phone: normalized });
      setPhone(normalized);
      if (data.step === "password") {
        setPassword("");
        setStep("password");
      } else {
        beginOtp(data);
      }
    });
  }

  // ───── ورود با رمز ─────
  function submitPassword(e) {
    e.preventDefault();
    if (!password) {
      setFieldError("رمز عبور را وارد کنید");
      return;
    }
    run(async () => {
      const data = await api("POST", "/api/auth/login", { phone, password });
      finish(data.user);
    });
  }

  function forgotPassword() {
    run(async () => {
      const data = await api("POST", "/api/auth/otp/send", { phone, purpose: "RESET_PASSWORD" });
      beginOtp(data);
    });
  }

  // ───── OTP ─────
  function verifyCode(value) {
    if (busy) return;
    if (expiresLeft === 0) {
      setFieldError("زمان اعتبار کد تمام شده است. کد جدید دریافت کنید");
      return;
    }
    if (value.length !== OTP_LENGTH) {
      setFieldError(`کد تأیید ${toFaDigits(OTP_LENGTH)} رقمی است`);
      return;
    }
    run(async () => {
      try {
        await api("POST", "/api/auth/otp/verify", { phone, purpose, code: value });
      } catch (err) {
        setCode("");
        throw err;
      }
      setPassword("");
      setConfirm("");
      setStep("setPassword");
    });
  }

  function resendCode() {
    run(async () => {
      try {
        // resend: true → سرور فاصله‌ی ۲ دقیقه‌ای رو اعمال می‌کنه
        const data = await api("POST", "/api/auth/otp/send", { phone, purpose, resend: true });
        beginOtp({ ...data, isNew });
      } catch (err) {
        const retryAfter = err.data?.retryAfter;
        if (retryAfter && retryAfter <= OTP_RESEND_SECONDS) {
          // هنوز از فاصله‌ی ۲ دقیقه‌ای نگذشته → تایمر رو با زمان واقعیِ سرور تنظیم کن
          setResendAt(Date.now() + retryAfter * 1000);
        } else if (err.status === 429 && retryAfter) {
          // سقف روزانه (۱۰ بار) تمام شده
          setDayLimited(true);
        }
        throw err;
      }
    });
  }

  // ───── تعیین رمز ─────
  function submitNewPassword(e) {
    e.preventDefault();
    const problem = checkPassword(password, phone);
    if (problem) {
      setFieldError(problem);
      return;
    }
    if (password !== confirm) {
      setFieldError("تکرار رمز عبور با رمز وارد شده یکی نیست");
      return;
    }
    run(async () => {
      try {
        const data = await api("POST", "/api/auth/set-password", { password });
        finish(data.user);
      } catch (err) {
        if (err.data?.code === "TICKET_EXPIRED") {
          setStep("phone");
        }
        throw err;
      }
    });
  }

  const passwordToggle = (
    <button
      type="button"
      onClick={() => setShowPw((v) => !v)}
      aria-label={showPw ? "پنهان کردن رمز" : "نمایش رمز"}
      className="absolute inset-y-0 left-0 flex w-12 items-center justify-center rounded-s-xl text-slate-500 transition hover:text-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-600/20"
    >
      {showPw ? <FaEyeSlash size={17} /> : <FaEye size={17} />}
    </button>
  );

  // مرحله‌های بعد از شماره: برگشت به وارد کردن شماره
  const backButton = (label = "تغییر شماره") => (
    <div>
      <BackButton variant="inline" hideOn={[]} label={label} onClick={goBackToPhone} />
    </div>
  );

  // نوار مراحلِ ثبت‌نام؛ فقط از مرحله‌ی کد تأیید به بعد معلومه که مسیر «ساخت حساب/بازیابی رمز» هست
  const journeyIndex = step === "otp" ? 1 : step === "setPassword" ? 2 : -1;

  // قدرت رمز (فقط مرحله‌ی تعیین رمز)
  const rules = passwordRules(password);
  const allRulesOk = rules.every((r) => r.ok);
  const strongBonus = password.length >= 12 || /[^\p{L}\d\s]/u.test(password);
  const strength = rules.filter((r) => r.ok).length + (allRulesOk && strongBonus ? 1 : 0);
  const confirmState = !confirm ? "" : confirm === password ? "match" : "mismatch";

  // یک تایمر واحد: «ارسال مجدد کد تا ...»؛ اعتبار کد و فاصله‌ی ارسال مجدد هر دو ۲ دقیقه‌ست
  const timerTotal = Math.max(OTP_RESEND_SECONDS, secondsLeft);
  const codeExpired = expiresLeft === 0;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-pop sm:p-7">
      {journeyIndex >= 0 && <StepProgress steps={JOURNEY} current={journeyIndex} className="mb-6 px-1" />}

      {/* ───────── شماره ───────── */}
      {step === "phone" && (
        <StepPane key="phone">
          <form onSubmit={submitPhone} noValidate className="space-y-6">
            {/* مرحله‌ی اول: برگشت به صفحه‌ی قبلی سایت */}
            <div>
              <BackButton variant="inline" hideOn={[]} fallback="/" />
            </div>
            <StepHeader icon={FaMobileAlt} title="ورود / ثبت‌نام">
              شماره موبایل خود را وارد کنید. اگر حساب ندارید، در چند قدم برایتان ساخته می‌شود.
            </StepHeader>
            <Field label="شماره موبایل" htmlFor="phone" error={fieldError}>
              <IconInput
                icon={FaMobileAlt}
                id="phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                dir="ltr"
                autoFocus
                placeholder="09123456789"
                value={phone}
                error={Boolean(fieldError)}
                onChange={(e) => {
                  setFieldError("");
                  setPhone(toEnglishDigits(e.target.value).replace(/[^\d+\s-]/g, ""));
                }}
                className="text-left text-base tracking-wider"
              />
            </Field>
            <div className="space-y-3">
              <button type="submit" disabled={busy} className={btnPrimary}>
                {busy && <Spinner />}
                ادامه
              </button>
              <p className="text-center text-[11px] leading-5 text-slate-500">
                با ادامه، <Link href="/terms" className="font-medium text-green-700 hover:underline">قوانین و حریم خصوصی</Link> سایت را می‌پذیرید.
              </p>
            </div>
          </form>
        </StepPane>
      )}

      {/* ───────── رمز عبور ───────── */}
      {step === "password" && (
        <StepPane key="password">
          <form onSubmit={submitPassword} noValidate className="space-y-6">
            {backButton()}
            <StepHeader icon={FaLock} title="خوش آمدید!">
              رمز عبور حساب <span dir="ltr" className="font-bold text-slate-700">{toFaDigits(phone)}</span> را وارد کنید.
            </StepHeader>
            <Field label="رمز عبور" htmlFor="password" error={fieldError}>
              <IconInput
                icon={FaLock}
                id="password"
                name="password"
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                dir="ltr"
                autoFocus
                value={password}
                error={Boolean(fieldError)}
                trailing={passwordToggle}
                onChange={(e) => {
                  setFieldError("");
                  setPassword(e.target.value);
                }}
                className="text-left"
              />
            </Field>
            <div className="space-y-3">
              <button type="submit" disabled={busy} className={btnPrimary}>
                {busy && <Spinner />}
                ورود
              </button>
              <button
                type="button"
                onClick={forgotPassword}
                disabled={busy}
                className="flex w-full items-center justify-center gap-1.5 rounded-full py-2 text-xs font-bold text-green-700 transition hover:bg-green-50 disabled:opacity-60"
              >
                <FaKey size={11} />
                رمز عبور را فراموش کرده‌ام (دریافت کد پیامکی)
              </button>
            </div>
          </form>
        </StepPane>
      )}

      {/* ───────── کد تأیید ───────── */}
      {step === "otp" && (
        <StepPane key="otp">
          <div className="space-y-6">
            {backButton()}
            <StepHeader icon={FaSms} title="کد تأیید را وارد کنید">
              کد {toFaDigits(OTP_LENGTH)} رقمی به شماره <span dir="ltr" className="font-bold text-slate-700">{toFaDigits(phone)}</span> پیامک شد.
              {purpose === "LOGIN" && isNew && " بعد از تأیید، حساب شما ساخته می‌شود."}
              {purpose === "RESET_PASSWORD" && " بعد از تأیید می‌توانید رمز جدید انتخاب کنید."}
            </StepHeader>

            {devCode && (
              <Alert kind="warning">
                حالت توسعه — کد تأیید: <b dir="ltr">{devCode}</b>{" "}
                <button
                  type="button"
                  className="ms-1 underline"
                  onClick={() => {
                    setCode(devCode);
                    verifyCode(devCode);
                  }}
                >
                  استفاده
                </button>
                <br />
                (این کادر در production نمایش داده نمی‌شود)
              </Alert>
            )}

            <div>
              <OtpInput
                value={code}
                onChange={(v) => {
                  resetMessages();
                  setCode(v);
                }}
                onComplete={verifyCode}
                disabled={busy}
                hasError={Boolean(error || fieldError)}
              />
              {fieldError && (
                <p role="alert" className="mt-3 text-center text-xs font-medium text-red-600">
                  {fieldError}
                </p>
              )}
            </div>

            <button type="button" onClick={() => verifyCode(code)} disabled={busy} className={btnPrimary}>
              {busy && <Spinner />}
              تأیید
            </button>

            {/* فقط یک تایمر: شمارش معکوس تا «ارسال مجدد»؛ بعد از صفر شدن دکمه‌ی ارسال مجدد ظاهر می‌شه */}
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs" aria-live="polite">
              {dayLimited ? (
                <p className="text-center leading-6 text-red-600">
                  سقف {toFaDigits(OTP_MAX_PER_DAY)} بار دریافت کد در روز تمام شده است. فردا دوباره تلاش کنید.
                </p>
              ) : secondsLeft > 0 ? (
                <div>
                  <div className="flex items-center justify-between text-slate-500">
                    <span>ارسال مجدد کد تا</span>
                    <b dir="ltr" className="tabular-nums text-sm text-slate-800">
                      {formatClock(secondsLeft)}
                    </b>
                  </div>
                  <div
                    role="progressbar"
                    aria-label="زمان باقی‌مانده تا ارسال مجدد کد"
                    aria-valuemin={0}
                    aria-valuemax={timerTotal}
                    aria-valuenow={secondsLeft}
                    className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-200"
                  >
                    <div
                      className="h-full rounded-full bg-green-600 transition-[width] duration-1000 ease-linear"
                      style={{ width: `${(secondsLeft / timerTotal) * 100}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <p className={codeExpired ? "font-medium text-red-600" : "text-slate-500"}>
                    {codeExpired ? "زمان اعتبار کد تمام شد." : "کد را دریافت نکردید؟"}
                  </p>
                  <button
                    type="button"
                    onClick={resendCode}
                    disabled={busy}
                    className="shrink-0 rounded-full bg-green-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-green-700 disabled:opacity-60"
                  >
                    ارسال مجدد کد
                  </button>
                </div>
              )}
            </div>
          </div>
        </StepPane>
      )}

      {/* ───────── تعیین رمز ───────── */}
      {step === "setPassword" && (
        <StepPane key="setPassword">
          <form onSubmit={submitNewPassword} noValidate className="space-y-6">
            <StepHeader icon={FaLock} title={purpose === "RESET_PASSWORD" ? "رمز عبور جدید" : "رمز عبور خود را انتخاب کنید"}>
              {purpose === "RESET_PASSWORD"
                ? "با تغییر رمز، از سایر دستگاه‌ها خارج می‌شوید."
                : "شماره شما تأیید شد. دفعه‌های بعد با همین رمز وارد می‌شوید."}
            </StepHeader>

            <div className="space-y-4">
              <Field label="رمز عبور" htmlFor="new-password" error={fieldError}>
                <IconInput
                  icon={FaLock}
                  id="new-password"
                  name="new-password"
                  type={showPw ? "text" : "password"}
                  autoComplete="new-password"
                  dir="ltr"
                  autoFocus
                  value={password}
                  error={Boolean(fieldError)}
                  trailing={passwordToggle}
                  onChange={(e) => {
                    setFieldError("");
                    setPassword(e.target.value);
                  }}
                  className="text-left"
                />
              </Field>

              {/* قدرت رمز + چک‌لیست قوانین (به‌صورت زنده) */}
              <div className="space-y-2.5" aria-live="polite">
                <div className="flex items-center gap-2">
                  <div className="grid flex-1 grid-cols-4 gap-1.5" aria-hidden="true">
                    {[1, 2, 3, 4].map((n) => (
                      <span
                        key={n}
                        className={`h-1.5 rounded-full transition-colors duration-300 ${n <= strength ? STRENGTH[strength].bar : "bg-slate-200"}`}
                      />
                    ))}
                  </div>
                  <span className={`w-16 text-end text-[11px] font-bold ${STRENGTH[strength].text}`}>
                    {password ? STRENGTH[strength].label : ""}
                  </span>
                </div>
                <ul className="flex flex-wrap gap-1.5">
                  {rules.map((r) => (
                    <li
                      key={r.label}
                      className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        r.ok ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {r.ok && <FaCheck size={9} aria-hidden="true" />}
                      {r.label}
                    </li>
                  ))}
                </ul>
              </div>

              <Field label="تکرار رمز عبور" htmlFor="confirm-password">
                <IconInput
                  icon={FaLock}
                  id="confirm-password"
                  name="confirm-password"
                  type={showPw ? "text" : "password"}
                  autoComplete="new-password"
                  dir="ltr"
                  value={confirm}
                  error={confirmState === "mismatch"}
                  onChange={(e) => {
                    setFieldError("");
                    setConfirm(e.target.value);
                  }}
                  className="text-left"
                />
                {confirmState && (
                  <p className={`mt-1.5 text-xs ${confirmState === "match" ? "text-green-700" : "text-red-600"}`} aria-live="polite">
                    {confirmState === "match" ? "رمزها یکی است." : "تکرار رمز با رمز بالا یکی نیست."}
                  </p>
                )}
              </Field>
            </div>

            <div className="space-y-2.5">
              <button type="submit" disabled={busy} className={btnPrimary}>
                {busy && <Spinner />}
                {purpose === "RESET_PASSWORD" ? "ثبت رمز جدید و ورود" : "ثبت رمز و ادامه"}
              </button>
              <button type="button" onClick={goBackToPhone} className={cn(btnSecondary, "w-full")}>
                انصراف
              </button>
            </div>
          </form>
        </StepPane>
      )}
    </div>
  );
}
