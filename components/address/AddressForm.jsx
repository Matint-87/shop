"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import { normalizeMobile, toEnglishDigits } from "@/lib/phone";
import { FaCheckCircle, FaExclamationTriangle, FaHome, FaMapMarkerAlt, FaPhoneAlt, FaRegBuilding, FaTag, FaUser } from "react-icons/fa";
import { Field, Spinner, btnPrimary, btnSecondary, inputCls } from "@/components/ui/form";
import { FormSection, IconInput, SwitchRow } from "@/components/ui/form-extras";
import { CitySelect, ProvinceSelect } from "./PlaceSelect";
import LocationPermissionModal from "./LocationPermissionModal";
import { notify, useToastOnChange } from "@/lib/toast";

const MapPicker = dynamic(() => import("./MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[26rem] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-xs text-slate-400 sm:h-[30rem]">
      <Spinner className="me-2 text-green-700" /> در حال بارگذاری نقشه...
    </div>
  ),
});

const emptyForm = {
  label: "",
  recipientName: "",
  recipientPhone: "",
  province: "",
  city: "",
  neighborhood: "",
  addressLine: "",
  plaque: "",
  unit: "",
  postalCode: "",
  isDefault: false,
};

function toForm(a) {
  if (!a) return emptyForm;
  return {
    label: a.label ?? "",
    recipientName: a.recipientName ?? "",
    recipientPhone: a.recipientPhone ?? "",
    province: a.province ?? "",
    city: a.city ?? "",
    neighborhood: a.neighborhood ?? "",
    addressLine: a.addressLine ?? "",
    plaque: a.plaque ?? "",
    unit: a.unit ?? "",
    postalCode: a.postalCode ?? "",
    isDefault: a.isDefault ?? false,
  };
}

const DENY_MESSAGES = {
  denied: "دسترسی به موقعیت مکانی رد شد؛ برای فعال‌کردن، از تنظیمات مرورگر (آیکن قفل کنار آدرس سایت) اجازه بدهید.",
  unavailable: "موقعیت شما پیدا نشد؛ مطمئن شوید GPS یا اینترنت دستگاه روشن است.",
  timeout: "یافتن موقعیت بیش از حد طول کشید.",
  unsupported: "مرورگر شما از موقعیت‌یابی پشتیبانی نمی‌کند.",
  insecure: "موقعیت‌یابی فقط روی اتصال امن (https) کار می‌کند.",
};

// عنوان‌های پرکاربرد (یک‌لمسی)
const LABEL_PRESETS = ["خانه", "محل کار", "خانه‌ی پدر و مادر"];

// راهنمای فعال‌کردن موقعیت وقتی مرورگر آن را مسدود کرده (ترتیب مهمه، پس شماره‌دار نشون داده می‌شه)
const UNBLOCK_STEPS = [
  "روی آیکن قفل کنار آدرس سایت (بالای مرورگر) بزنید.",
  "گزینه‌ی «موقعیت مکانی / Location» را روی «اجازه دادن / Allow» بگذارید.",
  "برگردید و روی «موقعیت من» (پایین نقشه) بزنید.",
];

function Note({ tone = "info", icon: Icon, children }) {
  const styles = {
    info: "bg-slate-50 text-slate-600",
    success: "bg-emerald-50 text-emerald-800",
    warn: "bg-amber-50 text-amber-800",
  }[tone];
  return (
    <p role="status" className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs leading-6 ${styles}`}>
      {Icon && <Icon size={13} className="mt-1.5 shrink-0" aria-hidden="true" />}
      <span>{children}</span>
    </p>
  );
}

const GEO_FIELDS = ["province", "city", "neighborhood", "addressLine", "plaque", "postalCode"];
const REQUIRED_LABELS = { province: "استان", city: "شهر", addressLine: "آدرس کامل", postalCode: "کد پستی" };

/**
 * فرم افزودن/ویرایش آدرس. ثبت آدرس فقط با انتخاب موقعیت روی نقشه انجامه (پین وسط نقشه، جست‌وجو یا «موقعیت من»)
 * و استان/شهر/محله/خیابان/پلاک (در صورت وجود) خودکار پر می‌شه؛ بعد کاربر نواقص رو دستی کامل می‌کنه.
 * فیلدی که کاربر خودش دستی تغییر داده باشه با جابه‌جایی بعدی پین دوباره بازنویسی نمی‌شه.
 * کد پستی معمولاً باید دستی وارد بشه چون سرویس نقشه به‌ندرت کد پستی دقیق ایران می‌ده.
 */
export default function AddressForm({ initialAddress, showDefaultToggle = true, onSaved, onCancel }) {
  const isEdit = Boolean(initialAddress?.id);
  const [form, setForm] = useState(() => toForm(initialAddress));
  const [coords, setCoords] = useState(
    initialAddress?.latitude != null ? { lat: initialAddress.latitude, lng: initialAddress.longitude } : null,
  );
  const formRef = useRef(form);
  useEffect(() => {
    formRef.current = form;
  }, [form]);
  // فیلدهایی که کاربر خودش دستی پر/اصلاح کرده؛ پر شدن خودکار از نقشه روشون نمی‌نویسه
  const touchedRef = useRef(new Set(isEdit ? GEO_FIELDS.filter((k) => form[k]) : []));
  const mapBoxRef = useRef(null);
  // checking: داریم وضعیت اجازه‌ی مرورگر رو می‌سنجیم | idle: هنوز چیزی نپرسیدیم | asked: کاربر اجازه داد (منتظر نتیجه‌ی مرورگر)
  // granted/denied: نتیجه معلوم شد | skipped: کاربر خودش رد کرد
  const [locationConsent, setLocationConsent] = useState(coords ? "skipped" : "checking");
  const [geoStatus, setGeoStatus] = useState(""); // "" | "loading" | "found" | "notfound"
  const [previewText, setPreviewText] = useState(""); // آدرس تقریبی نقطه‌ی انتخابی (برای کارت روی نقشه)
  const [denyReason, setDenyReason] = useState(""); // denied | unavailable | timeout | unsupported | insecure
  const [missing, setMissing] = useState([]); // فیلدهای ضروری‌ای که از نقشه پر نشدن
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  useToastOnChange(formError); // پیام خطا به‌صورت toast نشون داده می‌شه
  const [busy, setBusy] = useState(false);

  // اگه مرورگر قبلاً اجازه داده → مودال نشون نمی‌دیم و مستقیم موقعیت رو می‌گیریم
  // اگه قبلاً رد شده → مودالِ بی‌فایده نشون نمی‌دیم، فقط راهنمای فعال‌کردن رو نشون می‌دیم
  useEffect(() => {
    if (locationConsent !== "checking") return;
    let cancelled = false;
    const decide = (state) => {
      if (cancelled) return;
      if (state === "granted") setLocationConsent("asked");
      else if (state === "denied") {
        setDenyReason("denied");
        setLocationConsent("denied");
      } else setLocationConsent("idle");
    };
    if (typeof navigator === "undefined" || !navigator.permissions?.query) {
      decide("prompt");
      return;
    }
    navigator.permissions
      .query({ name: "geolocation" })
      .then((r) => decide(r.state))
      .catch(() => decide("prompt"));
    return () => {
      cancelled = true;
    };
  }, [locationConsent]);

  function setField(name, value) {
    touchedRef.current.add(name);
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => (e[name] ? { ...e, [name]: undefined } : e));
  }

  async function handleMapChange(point) {
    setCoords(point);
    setGeoStatus("loading");
    setErrors((e) => (e.location ? { ...e, location: undefined } : e));
    try {
      const data = await api("GET", `/api/geo/reverse?lat=${point.lat}&lng=${point.lng}`);
      if (!data.found) {
        setPreviewText("");
        setGeoStatus("notfound");
        setMissing(Object.keys(REQUIRED_LABELS).filter((k) => !formRef.current[k]));
        return;
      }
      const touched = touchedRef.current;
      const next = { ...formRef.current };
      for (const k of GEO_FIELDS) {
        if (!touched.has(k)) next[k] = data[k] ?? "";
      }
      // شهر به استان وابسته‌ست؛ اگه استان عوض شد و کاربر شهر رو دستی انتخاب نکرده، شهر نقشه جایگزین می‌شه
      if (touched.has("province") && next.province !== data.province && !touched.has("city")) next.city = "";
      setForm(next);
      setErrors((e) => {
        const cleared = { ...e };
        for (const k of GEO_FIELDS) if (next[k]) delete cleared[k];
        return cleared;
      });
      setMissing(Object.keys(REQUIRED_LABELS).filter((k) => !next[k]));
      setPreviewText([data.province, data.city, data.neighborhood, data.addressLine].filter(Boolean).join("، "));
      setGeoStatus("found");
    } catch {
      setPreviewText("");
      setGeoStatus("notfound");
      setMissing(Object.keys(REQUIRED_LABELS).filter((k) => !formRef.current[k]));
    }
  }

  async function submit(e) {
    e.preventDefault();
    setFormError("");
    if (!coords) {
      setErrors((er) => ({ ...er, location: "موقعیت آدرس را روی نقشه مشخص کنید" }));
      setFormError("موقعیت آدرس را روی نقشه مشخص کنید");
      mapBoxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setBusy(true);
    try {
      const payload = {
        ...form,
        recipientPhone: normalizeMobile(form.recipientPhone) || form.recipientPhone,
        postalCode: toEnglishDigits(form.postalCode),
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
      };
      const data = isEdit
        ? await api("PUT", `/api/addresses/${initialAddress.id}`, payload)
        : await api("POST", "/api/addresses", payload);
      notify.success("آدرس ذخیره شد.");
      onSaved?.(data.address);
    } catch (err) {
      if (err.fields && Object.keys(err.fields).length) setErrors(err.fields);
      else setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-7">
      {/* قبل از نقشه: توضیح و گرفتن اجازه‌ی دسترسی به موقعیت مکانی */}
      <LocationPermissionModal
        open={locationConsent === "idle"}
        onAccept={() => setLocationConsent("asked")}
        onDecline={() => setLocationConsent("skipped")}
      />

      <FormSection icon={FaMapMarkerAlt} title="موقعیت روی نقشه" hint="نقشه را بکشید تا پین روی محل دقیق بنشیند">
        <div ref={mapBoxRef} className="scroll-mt-24 space-y-3">
          <MapPicker
            value={coords}
            onChange={handleMapChange}
            onLocateStart={() => setGeoStatus("loading")}
            autoLocate={locationConsent === "asked"}
            onLocateEnd={(success, reason) => {
              setLocationConsent(success ? "granted" : "denied");
              setDenyReason(success ? "" : reason || "unavailable");
              if (!success) setGeoStatus((g) => (g === "loading" ? "" : g));
            }}
            addressPreview={previewText}
            addressLoading={geoStatus === "loading"}
            addressNotFound={geoStatus === "notfound"}
          />

          {locationConsent === "denied" && (
            <div role="status" className="rounded-2xl bg-amber-50 p-3.5 text-xs leading-6 text-amber-900">
              <p className="flex items-start gap-2 font-bold">
                <FaExclamationTriangle size={13} className="mt-1.5 shrink-0" aria-hidden="true" />
                {DENY_MESSAGES[denyReason] || DENY_MESSAGES.unavailable}
              </p>
              {(denyReason === "denied" || !denyReason) && (
                <ol className="mt-2 space-y-1.5 ps-1">
                  {UNBLOCK_STEPS.map((t, n) => (
                    <li key={t} className="flex items-start gap-2">
                      <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200/70 text-[10px] font-bold">
                        {["۱", "۲", "۳"][n]}
                      </span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ol>
              )}
              <p className="mt-2 text-amber-800/90">در هر حال می‌توانید آدرس را جست‌وجو کنید یا نقشه را خودتان جابه‌جا کنید.</p>
            </div>
          )}
          {geoStatus === "loading" && (
            <p className="flex items-center gap-2 text-xs text-slate-500">
              <Spinner className="text-green-700" /> در حال دریافت آدرس از روی نقشه...
            </p>
          )}
          {geoStatus === "found" && missing.length === 0 && (
            <Note tone="success" icon={FaCheckCircle}>
              فیلدهای زیر با موقعیت انتخابی پر شدند؛ لطفاً پلاک و واحد را اضافه و در صورت نیاز بقیه را اصلاح کنید.
            </Note>
          )}
          {geoStatus === "found" && missing.length > 0 && (
            <Note tone="warn" icon={FaExclamationTriangle}>
              بیشتر فیلدها با موقعیت انتخابی پر شدند؛ لطفاً این موارد را خودتان کامل کنید:{" "}
              <span className="font-bold">{missing.map((k) => REQUIRED_LABELS[k]).join("، ")}</span>
            </Note>
          )}
          {geoStatus === "notfound" && (
            <Note tone="warn" icon={FaExclamationTriangle}>
              نتوانستیم از این موقعیت آدرس دقیقی استخراج کنیم؛ لطفاً فیلدهای زیر را خودتان تکمیل کنید (موقعیت پین ذخیره می‌شود).
            </Note>
          )}
          {errors.location && <p className="text-xs font-medium text-red-600">{errors.location}</p>}
        </div>
      </FormSection>

      <FormSection icon={FaUser} title="تحویل‌گیرنده">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="نام تحویل‌گیرنده" htmlFor="recipientName" error={errors.recipientName} required>
            <IconInput
              icon={FaUser}
              id="recipientName"
              autoComplete="name"
              value={form.recipientName}
              error={Boolean(errors.recipientName)}
              onChange={(e) => setField("recipientName", e.target.value)}
            />
          </Field>
          <Field label="موبایل تحویل‌گیرنده" htmlFor="recipientPhone" error={errors.recipientPhone} required>
            <IconInput
              icon={FaPhoneAlt}
              id="recipientPhone"
              dir="ltr"
              inputMode="numeric"
              autoComplete="tel-national"
              value={form.recipientPhone}
              error={Boolean(errors.recipientPhone)}
              onChange={(e) => setField("recipientPhone", toEnglishDigits(e.target.value).replace(/[^\d+]/g, ""))}
              className="text-left tracking-wider"
            />
          </Field>
        </div>
      </FormSection>

      <FormSection icon={FaRegBuilding} title="نشانی">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ProvinceSelect
            value={form.province}
            onChange={(v) => {
              setField("province", v);
              setField("city", "");
            }}
            error={errors.province}
          />
          <CitySelect province={form.province} value={form.city} onChange={(v) => setField("city", v)} error={errors.city} />

          <Field label="محله" htmlFor="neighborhood" className="sm:col-span-2">
            <input
              id="neighborhood"
              value={form.neighborhood}
              onChange={(e) => setField("neighborhood", e.target.value)}
              maxLength={80}
              className={inputCls(false)}
            />
          </Field>

          <Field label="آدرس کامل" htmlFor="addressLine" error={errors.addressLine} required className="sm:col-span-2">
            <textarea
              id="addressLine"
              value={form.addressLine}
              onChange={(e) => setField("addressLine", e.target.value)}
              rows={2}
              maxLength={300}
              placeholder="مثال: شهرک انقلاب، بل خرم رودی، خ. ابراهیمی"
              className={`${inputCls(Boolean(errors.addressLine))} h-auto py-3`}
            />
          </Field>

          <Field label="پلاک" htmlFor="plaque">
            <input id="plaque" value={form.plaque} onChange={(e) => setField("plaque", e.target.value)} maxLength={10} className={inputCls(false)} />
          </Field>
          <Field label="واحد" htmlFor="unit">
            <input id="unit" value={form.unit} onChange={(e) => setField("unit", e.target.value)} maxLength={10} className={inputCls(false)} />
          </Field>

          <Field label="کد پستی" htmlFor="postalCode" error={errors.postalCode} required className="sm:col-span-2">
            <input
              id="postalCode"
              dir="ltr"
              inputMode="numeric"
              value={form.postalCode}
              onChange={(e) => setField("postalCode", toEnglishDigits(e.target.value).replace(/\D/g, "").slice(0, 10))}
              className={`${inputCls(Boolean(errors.postalCode))} text-left tracking-wider`}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection icon={FaTag} title="عنوان آدرس" hint="اختیاری؛ برای پیدا کردن سریع‌تر آدرس در سفارش‌های بعدی">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="عنوان‌های پیشنهادی">
            {LABEL_PRESETS.map((l) => {
              const active = form.label === l;
              return (
                <button
                  key={l}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setField("label", active ? "" : l)}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-600/20",
                    active
                      ? "border-green-600 bg-green-600 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-green-600/40 hover:text-green-700",
                  )}
                >
                  {l === "خانه" && <FaHome size={11} aria-hidden="true" />}
                  {l}
                </button>
              );
            })}
          </div>
          <input
            id="label"
            aria-label="عنوان آدرس"
            value={form.label}
            onChange={(e) => setField("label", e.target.value)}
            maxLength={30}
            placeholder="یا عنوان دلخواه خودتان را بنویسید"
            className={inputCls(false)}
          />
        </div>
      </FormSection>

      {showDefaultToggle && (
        <SwitchRow
          id="isDefault"
          checked={form.isDefault}
          onChange={(v) => setField("isDefault", v)}
          title="آدرس پیش‌فرض"
          description="سفارش‌های بعدی به‌صورت پیش‌فرض به این آدرس ارسال می‌شود."
        />
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        {onCancel && (
          <button type="button" onClick={onCancel} className={cn(btnSecondary, "sm:flex-1")}>
            انصراف
          </button>
        )}
        <button type="submit" disabled={busy} className={cn(btnPrimary, "sm:flex-1")}>
          {busy && <Spinner />}
          {isEdit ? "ذخیره تغییرات" : "افزودن آدرس"}
        </button>
      </div>
    </form>
  );
}
