"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Field, Spinner, btnPrimary, inputCls } from "@/components/ui/form";
import { Card, PageHeader } from "@/components/admin/ui";
import { api } from "@/lib/api-client";
import { computeCourierFee } from "@/lib/shipping-cost";
import { POST_SHIPPING_OFFERED } from "@/lib/shipping";
import { notify, useToastOnChange } from "@/lib/toast";

// نقشه فقط سمت مرورگر لود می‌شه (لیفلت)
const MapPicker = dynamic(() => import("@/components/address/MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-400 sm:h-80">
      در حال بارگذاری نقشه...
    </div>
  ),
});

// فیلدهای عددی پیک؛ هر گروه یک بخش توی فرمه
const COURIER_GROUPS = [
  {
    title: "مسافت",
    fields: [
      { name: "courierBaseFee", label: "هزینه‌ی پایه (تومان)", hint: "هزینه‌ی هر سفارش قبل از مسافت و وزن" },
      { name: "courierIncludedKm", label: "مسافت شامل‌شده (کیلومتر)", hint: "تا این مسافت هزینه‌ی اضافه ندارد" },
      { name: "courierPerKm", label: "هر کیلومتر اضافه (تومان)" },
      { name: "maxDeliveryKm", label: "حداکثر مسافت پیک (کیلومتر)", hint: "صفر = محدودیت نداریم" },
    ],
  },
  {
    title: "وزن و حجم",
    fields: [
      { name: "freeWeightKg", label: "وزن شامل‌شده (کیلوگرم)", hint: "تا این وزن هزینه‌ی اضافه ندارد" },
      { name: "perKgFee", label: "هر کیلوگرم اضافه (تومان)" },
      { name: "volumetricLitersPerKg", label: "وزن حجمی (لیتر به ازای هر کیلو)", hint: "برای کالای حجیم و سبک" },
      { name: "defaultItemWeightKg", label: "وزن پیش‌فرض کالای بدون وزن (کیلوگرم)", hint: "برای واحدهای عدد/باکس/کارتن" },
    ],
  },
  {
    title: "تعداد اقلام",
    fields: [
      { name: "includedItems", label: "تعداد شامل‌شده", hint: "جمع تعداد کالاهای سبد" },
      { name: "perExtraItemFee", label: "هر قلم اضافه (تومان)", hint: "اگه نمی‌خوای تعداد هزینه داشته باشه صفر بذار" },
    ],
  },
  {
    title: "حداقل، حداکثر و گرد کردن",
    fields: [
      { name: "minFee", label: "حداقل هزینه (تومان)" },
      { name: "maxFee", label: "حداکثر هزینه (تومان)", hint: "صفر = سقف نداریم" },
      { name: "roundTo", label: "گرد کردن به مضرب (تومان)", hint: "مثلاً ۱۰۰۰" },
    ],
  },
];

const NUMERIC_FIELDS = [
  ...COURIER_GROUPS.flatMap((g) => g.fields.map((f) => f.name)),
];

const toman = (n) => `${Math.round(n).toLocaleString("fa-IR")} تومان`;

function Toggle({ id, checked, onChange, title, description }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-green-200">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5" />
      <span>
        <span className="block text-xs font-bold text-slate-800">{title}</span>
        {description && <span className="mt-0.5 block text-xs text-slate-500">{description}</span>}
      </span>
    </label>
  );
}

/** عنوان کوچک هر بخش داخل کارت */
function Section({ title, children }) {
  return (
    <div className="mt-5 border-t border-slate-100 pt-4">
      <h3 className="mb-3 text-xs font-bold text-slate-700">{title}</h3>
      {children}
    </div>
  );
}

function NumberField({ f, form, errors, setField }) {
  return (
    <Field label={f.label} htmlFor={f.name} error={errors[f.name]} hint={f.hint}>
      <input
        id={f.name}
        type="number"
        step="any"
        min="0"
        inputMode="decimal"
        value={form[f.name]}
        onChange={(e) => setField(f.name, e.target.value)}
        className={inputCls(Boolean(errors[f.name]))}
      />
    </Field>
  );
}

/** کادر «محاسبه‌ی نمونه» تا ادمین اثر اعداد رو همون لحظه ببینه */
function Simulator({ children, result }) {
  return (
    <div className="mt-4 rounded-xl bg-green-50/70 p-3 ring-1 ring-green-600/15">
      <p className="mb-2 text-xs font-bold text-green-800">محاسبه‌ی نمونه</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{children}</div>
      <p className="mt-3 text-sm font-bold text-green-900">{result}</p>
    </div>
  );
}

function SimInput({ label, value, onChange }) {
  return (
    <label className="block text-xs text-slate-600">
      {label}
      <input type="number" min="0" step="any" value={value} onChange={(e) => onChange(e.target.value)} className={cn(inputCls(false), "mt-1 h-10")} />
    </label>
  );
}

export default function ShippingSettingsForm({ initial }) {
  const [form, setForm] = useState({
    ...initial,
    defaultFee: String(initial.defaultFee),
    freeShippingOver: String(initial.freeShippingOver),
    courierMinOrder: String(initial.courierMinOrder ?? 0),
    ...Object.fromEntries(NUMERIC_FIELDS.map((name) => [name, String(initial[name] ?? "")])),
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  useToastOnChange(error); // پیام خطا به‌صورت toast نشون داده می‌شه
  const [busy, setBusy] = useState(false);

  // ورودی‌های محاسبه‌ی نمونه
  const [simCourier, setSimCourier] = useState({ km: "5", kg: "20", items: "10" });

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => (e[name] ? { ...e, [name]: undefined } : e));
  }

  // تنظیمات عددی‌شده برای فرمول‌ها (خالی = صفر)
  const numeric = useMemo(() => {
    const out = {};
    for (const name of NUMERIC_FIELDS) out[name] = Number(form[name]) || 0;
    return out;
  }, [form]);

  const courierSample = useMemo(() => {
    const load = { chargeableKg: Number(simCourier.kg) || 0, itemCount: Number(simCourier.items) || 0 };
    return computeCourierFee({ distanceKm: Number(simCourier.km) || 0, load, settings: numeric });
  }, [numeric, simCourier]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setError("");
    try {
      await api("PUT", "/api/admin/shipping-settings", form);
      notify.success("تنظیمات ارسال ذخیره شد.");
    } catch (err) {
      if (err.fields && Object.keys(err.fields).length) setErrors(err.fields);
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const hasStorePin = form.storeLat != null && form.storeLat !== "";

  return (
    <div>
      <PageHeader title="تنظیمات ارسال" description="روش‌های ارسال، هزینه‌ها و زمان تحویل" />
      <form onSubmit={submit} noValidate className="space-y-4">

        <Card title="روش‌های ارسال">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {POST_SHIPPING_OFFERED && <Toggle id="post" checked={form.postEnabled} onChange={(v) => setField("postEnabled", v)} title="ارسال با پست" description="ارسال به سراسر کشور" />}
            <Toggle id="courier" checked={form.courierEnabled} onChange={(v) => setField("courierEnabled", v)} title="ارسال با پیک" description="تحویل درب منزل با پیک فروشگاه" />
            <Toggle id="pickup" checked={form.pickupEnabled} onChange={(v) => setField("pickupEnabled", v)} title="دریافت حضوری" description="تحویل در فروشگاه" />
          </div>
          {POST_SHIPPING_OFFERED && (
          <>
          <div className="mt-3">
            <Toggle
              id="postFreightCollect"
              checked={form.postFreightCollect}
              onChange={(v) => setField("postFreightCollect", v)}
              title="پست با پس‌کرایه"
              description="هزینه‌ی پست را مشتری هنگام تحویل مرسوله مستقیم به شرکت پست می‌پردازد و از او هنگام ثبت سفارش چیزی گرفته نمی‌شود."
            />
          </div>
          <div className="mt-3">
            <Toggle
              id="postTehranOnly"
              checked={form.postTehranOnly}
              onChange={(v) => setField("postTehranOnly", v)}
              title="پست فقط برای تهران"
              description="اگر روشن باشد، ارسال با پست فقط برای آدرس‌هایی که شهرشان «تهران» است فعال است و سایر شهرها (حتی داخل استان تهران) امکان انتخاب پست را ندارند."
            />
          </div>
          </>
          )}
          <Field
            label="حداقل مبلغ سفارش برای ارسال با پیک (تومان)"
            htmlFor="courierMinOrder"
            error={errors.courierMinOrder}
            hint="مثلاً ۵٬۰۰۰٬۰۰۰ — اگر جمع کالاهای سبد (بعد از تخفیف) کمتر از این مبلغ باشد، پیک غیرفعال می‌شود و مشتری فقط می‌تواند دریافت حضوری از فروشگاه را انتخاب کند. صفر = محدودیت نداریم"
            className="mt-4"
          >
            <input id="courierMinOrder" type="number" min="0" value={form.courierMinOrder} onChange={(e) => setField("courierMinOrder", e.target.value)} className={inputCls(Boolean(errors.courierMinOrder))} />
          </Field>
          <Field label="آدرس فروشگاه" htmlFor="pickupAddress" error={errors.pickupAddress} className="mt-4">
            <input id="pickupAddress" value={form.pickupAddress} onChange={(e) => setField("pickupAddress", e.target.value)} className={inputCls(Boolean(errors.pickupAddress))} />
          </Field>
        </Card>

        <Card title="هزینه‌ی پیش‌فرض">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="هزینه‌ی پیش‌فرض ارسال (تومان)" htmlFor="defaultFee" error={errors.defaultFee} hint="برای مناطقی که در هیچ محدوده‌ای نیستند. صفر = رایگان">
              <input id="defaultFee" type="number" min="0" value={form.defaultFee} onChange={(e) => setField("defaultFee", e.target.value)} className={inputCls(Boolean(errors.defaultFee))} />
            </Field>
            <Field label="ارسال رایگان برای سفارش بالای (تومان)" htmlFor="freeOver" error={errors.freeShippingOver} hint="صفر = ارسال رایگان نداریم. روی پیک و پست محاسبه‌ی خودکار هم اعمال می‌شود">
              <input id="freeOver" type="number" min="0" value={form.freeShippingOver} onChange={(e) => setField("freeShippingOver", e.target.value)} className={inputCls(Boolean(errors.freeShippingOver))} />
            </Field>
          </div>
        </Card>

        <Card title="هزینه‌ی پیک بر اساس مسافت و وزن">
          <Toggle
            id="distanceEnabled"
            checked={form.distanceEnabled}
            onChange={(v) => setField("distanceEnabled", v)}
            title="محاسبه‌ی خودکار هزینه‌ی پیک"
            description="هزینه = پایه + مسافت اضافه + وزن اضافه + اقلام اضافه. خاموش = پیک از هزینه‌ی پیش‌فرض یا محدوده‌ها حساب می‌شود."
          />

          {form.distanceEnabled && (
            <>
              <Section title="موقعیت فروشگاه (مبدأ مسافت)">
                <MapPicker
                  value={hasStorePin ? { lat: Number(form.storeLat), lng: Number(form.storeLng) } : null}
                  onChange={({ lat, lng }) => {
                    setField("storeLat", lat);
                    setField("storeLng", lng);
                  }}
                />
                <p className={cn("mt-2 text-xs", errors.storeLat ? "text-rose-600" : "text-slate-500")}>
                  {errors.storeLat || (hasStorePin ? "موقعیت فروشگاه ثبت شد." : "روی نقشه بزنید تا موقعیت فروشگاه مشخص شود.")}
                </p>
              </Section>

              {COURIER_GROUPS.map((g) => (
                <Section key={g.title} title={g.title}>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {g.fields.map((f) => (
                      <NumberField key={f.name} f={f} form={form} errors={errors} setField={setField} />
                    ))}
                  </div>
                </Section>
              ))}

              <Simulator
                result={`هزینه‌ی پیک: ${toman(courierSample.fee)}  (پایه ${toman(courierSample.parts.base)} + مسافت ${toman(courierSample.parts.distance)} + وزن ${toman(courierSample.parts.weight)} + اقلام ${toman(courierSample.parts.items)})`}
              >
                <SimInput label="مسافت (کیلومتر)" value={simCourier.km} onChange={(v) => setSimCourier((s) => ({ ...s, km: v }))} />
                <SimInput label="وزن سبد (کیلوگرم)" value={simCourier.kg} onChange={(v) => setSimCourier((s) => ({ ...s, kg: v }))} />
                <SimInput label="تعداد اقلام" value={simCourier.items} onChange={(v) => setSimCourier((s) => ({ ...s, items: v }))} />
              </Simulator>
            </>
          )}
        </Card>

        <Card title="زمان تحویل">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="تهران" htmlFor="tehranTime" error={errors.tehranDeliveryTime}>
              <input id="tehranTime" value={form.tehranDeliveryTime} onChange={(e) => setField("tehranDeliveryTime", e.target.value)} className={inputCls(Boolean(errors.tehranDeliveryTime))} />
            </Field>
            <Field label="سایر مناطق" htmlFor="otherTime" error={errors.otherDeliveryTime}>
              <input id="otherTime" value={form.otherDeliveryTime} onChange={(e) => setField("otherDeliveryTime", e.target.value)} className={inputCls(Boolean(errors.otherDeliveryTime))} />
            </Field>
          </div>
          <Field label="توضیحات ارسال" htmlFor="note" error={errors.note} className="mt-4">
            <textarea id="note" rows={3} value={form.note} onChange={(e) => setField("note", e.target.value)} className={`${inputCls(Boolean(errors.note))} h-auto py-3`} />
          </Field>
        </Card>

        <button type="submit" disabled={busy} className={cn(btnPrimary, "w-auto px-8")}>
          {busy && <Spinner />}
          ذخیره‌ی تنظیمات
        </button>
      </form>
    </div>
  );
}
