"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FaCheck,
  FaDesktop,
  FaEye,
  FaEyeSlash,
  FaKey,
  FaLock,
  FaMobileAlt,
  FaShieldAlt,
  FaSignOutAlt,
  FaTabletAlt,
} from "react-icons/fa";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form";
import { IconInput } from "@/components/ui/form-extras";
import { api } from "@/lib/api-client";
import { formatJalaliDateTime } from "@/lib/jalali";
import { toFaDigits } from "@/lib/phone";
import { notify } from "@/lib/toast";

// ───────────── تغییر رمز عبور ─────────────

// همون قانون‌های lib/validators.js#checkPassword (سرور هم دوباره چکشون می‌کنه)
function passwordRules(pw, phone) {
  const en = pw.replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));
  return [
    { ok: pw.length >= 8, text: "حداقل ۸ کاراکتر" },
    { ok: /\p{L}/u.test(pw), text: "حداقل یک حرف" },
    { ok: /\d/.test(en), text: "حداقل یک عدد" },
    { ok: pw.length > 0 && !en.includes(phone), text: "شبیه شماره موبایل نباشد" },
  ];
}

function PasswordToggle({ shown, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? "پنهان کردن رمز" : "نمایش رمز"}
      className="absolute inset-y-0 left-0 flex w-12 items-center justify-center rounded-s-xl text-slate-500 transition hover:text-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-600/20"
    >
      {shown ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
    </button>
  );
}

function ChangePasswordCard({ phone }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});

  const rules = passwordRules(next, phone);
  const rulesOk = rules.every((r) => r.ok);
  const mismatch = again.length > 0 && again !== next;

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    const fe = {};
    if (!current) fe.currentPassword = "رمز عبور فعلی را وارد کنید";
    if (!rulesOk) fe.newPassword = "رمز جدید همه‌ی شرط‌ها را ندارد";
    if (next && again !== next) fe.again = "تکرار رمز با رمز جدید یکسان نیست";
    setErrors(fe);
    if (Object.keys(fe).length) return;

    setBusy(true);
    try {
      await api("POST", "/api/profile/password", { currentPassword: current, newPassword: next });
      notify.success("رمز عبور تغییر کرد. از دستگاه‌های دیگر خارج شدید و فقط این دستگاه وارد مانده است.");
      setCurrent("");
      setNext("");
      setAgain("");
      setErrors({});
    } catch (err) {
      setErrors({ currentPassword: err.fields?.currentPassword, newPassword: err.fields?.newPassword });
      notify.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  const toggle = <PasswordToggle shown={show} onToggle={() => setShow((v) => !v)} />;
  const type = show ? "text" : "password";

  return (
    <form onSubmit={submit} noValidate className="space-y-4 rounded-2xl border border-slate-200/80 p-4 sm:p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50 text-green-700">
          <FaKey size={14} />
        </span>
        <div>
          <h3 className="text-sm font-extrabold text-slate-800">تغییر رمز عبور</h3>
          <p className="text-xs text-slate-500">بعد از تغییر، از همه‌ی دستگاه‌های دیگر خارج می‌شوید.</p>
        </div>
      </div>

      <Field label="رمز عبور فعلی" htmlFor="cur-pw" error={errors.currentPassword}>
        <IconInput
          icon={FaLock}
          id="cur-pw"
          type={type}
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          error={Boolean(errors.currentPassword)}
          trailing={toggle}
          dir="ltr"
          className="text-left"
        />
      </Field>

      <Field label="رمز عبور جدید" htmlFor="new-pw" error={errors.newPassword}>
        <IconInput
          icon={FaKey}
          id="new-pw"
          type={type}
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          error={Boolean(errors.newPassword)}
          dir="ltr"
          className="text-left"
        />
      </Field>

      {next && (
        <ul className="grid grid-cols-1 gap-1.5 rounded-xl bg-slate-50 p-3 text-xs sm:grid-cols-2" aria-label="شرط‌های رمز عبور">
          {rules.map((r) => (
            <li key={r.text} className={`flex items-center gap-2 ${r.ok ? "text-emerald-700" : "text-slate-500"}`}>
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                  r.ok ? "bg-emerald-600 text-white" : "bg-slate-200"
                }`}
              >
                {r.ok && <FaCheck size={8} />}
              </span>
              {r.text}
            </li>
          ))}
        </ul>
      )}

      <Field label="تکرار رمز عبور جدید" htmlFor="again-pw" error={errors.again || (mismatch ? "تکرار رمز با رمز جدید یکسان نیست" : "")}>
        <IconInput
          icon={FaKey}
          id="again-pw"
          type={type}
          autoComplete="new-password"
          value={again}
          onChange={(e) => setAgain(e.target.value)}
          error={mismatch || Boolean(errors.again)}
          dir="ltr"
          className="text-left"
        />
      </Field>

      <Button type="submit" size="lg" disabled={busy} className="w-full sm:w-auto sm:min-w-48">
        {busy ? "در حال ذخیره…" : "ذخیره‌ی رمز جدید"}
      </Button>
    </form>
  );
}

// ───────────── دستگاه‌ها ─────────────

const TYPE_ICON = { mobile: FaMobileAlt, tablet: FaTabletAlt, desktop: FaDesktop };

function DeviceRow({ device, canManage, busy, onRevoke }) {
  const Icon = TYPE_ICON[device.deviceType] ?? FaDesktop;
  return (
    <li className="flex items-start gap-3 p-3 sm:p-4">
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
          device.isCurrent ? "bg-green-600 text-white shadow-brand" : "bg-slate-100 text-slate-500"
        }`}
      >
        <Icon size={18} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-sm font-extrabold text-slate-800" dir="ltr">
            {device.browser} · {device.os}
          </p>
          {device.isCurrent && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">این دستگاه</span>
          )}
          {device.isOrigin && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-bold text-green-700">
              <FaShieldAlt size={9} /> دستگاه اصلی
            </span>
          )}
        </div>
        <p className="mt-1 text-xs leading-6 text-slate-500">
          {device.isCurrent ? "اکنون فعال" : `آخرین فعالیت: ${formatJalaliDateTime(device.lastSeenAt)}`}
        </p>
        <p className="text-xs leading-6 text-slate-400">
          ورود: {formatJalaliDateTime(device.createdAt)}
          {device.ip && (
            <>
              {" · "}IP: <span dir="ltr">{toFaDigits(device.ip)}</span>
            </>
          )}
        </p>
      </div>

      {!device.isCurrent && canManage && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => onRevoke(device)}
          className="shrink-0"
          aria-label={`خروج دستگاه ${device.browser} ${device.os}`}
        >
          <FaSignOutAlt size={11} aria-hidden="true" />
          خروج
        </Button>
      )}
    </li>
  );
}

function DevicesCard() {
  const confirm = useConfirm();
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const d = await api("GET", "/api/profile/sessions");
      setData(d);
      setFailed(false);
    } catch (err) {
      setFailed(true);
      notify.error(err.message);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    api("GET", "/api/profile/sessions")
      .then((d) => alive && setData(d))
      .catch((err) => {
        if (!alive) return;
        setFailed(true);
        notify.error(err.message);
      });
    return () => {
      alive = false;
    };
  }, []);

  async function revokeOne(device) {
    const ok = await confirm({
      title: "خروج از این دستگاه",
      description: `دستگاه «${device.browser} · ${device.os}» از حساب شما خارج می‌شود و برای ورود دوباره به رمز عبور نیاز دارد.`,
      confirmText: "خروج دستگاه",
    });
    if (!ok) return;
    setBusyId(device.id);
    try {
      await api("DELETE", `/api/profile/sessions/${device.id}`, {});
      notify.success("دستگاه از حساب خارج شد");
      await load();
    } catch (err) {
      notify.error(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function revokeOthers() {
    const ok = await confirm({
      title: "خروج از همه‌ی دستگاه‌های دیگر",
      description: "همه‌ی دستگاه‌ها به‌جز همین دستگاه از حساب شما خارج می‌شوند.",
      confirmText: "خروج از بقیه‌ی دستگاه‌ها",
    });
    if (!ok) return;
    setBusyId("all");
    try {
      await api("POST", "/api/profile/sessions/revoke-others", {});
      notify.success("از همه‌ی دستگاه‌های دیگر خارج شدید");
      await load();
    } catch (err) {
      notify.error(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const others = data ? data.devices.filter((d) => !d.isCurrent) : [];

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200/80 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50 text-green-700">
            <FaDesktop size={14} />
          </span>
          <div>
            <h3 className="text-sm font-extrabold text-slate-800">دستگاه‌های وارد‌شده</h3>
            <p className="text-xs text-slate-500">همه‌ی جاهایی که با حساب شما وارد شده‌اند.</p>
          </div>
        </div>
      </div>

      {!data && !failed && <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />}

      {failed && !data && (
        <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center">
          <p className="text-xs text-slate-500">دریافت فهرست دستگاه‌ها انجام نشد.</p>
          <Button type="button" size="sm" variant="outline" className="mt-3" onClick={load}>
            تلاش دوباره
          </Button>
        </div>
      )}

      {data && (
        <>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80">
            {data.devices.map((d) => (
              <DeviceRow key={d.id} device={d} canManage={data.canManage} busy={busyId !== null} onRevoke={revokeOne} />
            ))}
          </ul>

          {data.canManage ? (
            others.length > 0 && (
              <Button
                type="button"
                variant="outline"
                disabled={busyId !== null}
                onClick={revokeOthers}
                className="w-full sm:w-auto"
              >
                <FaSignOutAlt size={12} aria-hidden="true" />
                خروج از همه‌ی دستگاه‌های دیگر
              </Button>
            )
          ) : (
            <p className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs leading-6 text-slate-500">
              <FaShieldAlt size={12} className="mt-1.5 shrink-0" aria-hidden="true" />
              فقط دستگاهی که حساب را روی آن ساخته‌اید (دستگاه اصلی) می‌تواند دستگاه‌های دیگر را ببندد. اگر به آن دسترسی
              ندارید، با «فراموشی رمز عبور» در صفحه‌ی ورود، همه‌ی دستگاه‌ها بسته می‌شوند.
            </p>
          )}
        </>
      )}
    </section>
  );
}

/** بخش «امنیت و دستگاه‌ها» در پنل کاربری: تغییر رمز + فهرست دستگاه‌ها */
export default function SecurityPanel({ phone }) {
  return (
    <div className="space-y-5">
      <DevicesCard />
      <ChangePasswordCard phone={phone} />
    </div>
  );
}
