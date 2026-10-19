"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { FaEdit, FaPlus, FaPowerOff, FaTrash } from "react-icons/fa";
import { Select } from "@/components/ui/select";
import { Field, Spinner, btnPrimary, btnSecondary, inputCls } from "@/components/ui/form";
import { ActiveBadge, Card, EmptyRow, PageHeader, theadRowCls, trCls } from "@/components/admin/ui";
import { PAYMENT_ACCOUNT_KIND_META, PAYMENT_ACCOUNT_KIND_OPTIONS } from "@/lib/admin-constants";
import { api } from "@/lib/api-client";
import { formatNumber, formatToman } from "@/lib/format";
import { toFaDigits } from "@/lib/phone";
import { notify, useToastOnChange } from "@/lib/toast";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import FormModal, { useRetained } from "@/components/admin/FormModal";

const EMPTY = { kind: "CASH_BOX", name: "", bankName: "", cardNumber: "", holderName: "", isActive: true };

// متن راهنمای هر نوع (زیر انتخاب نوع نشون داده می‌شه)
const KIND_HINT = {
  CASH_BOX: "پولِ نقدی که از مشتری می‌گیرید (مثلاً صندوق مغازه یا پولی که پیک تحویل می‌دهد).",
  BANK: "حساب یا کارت بانکی که مشتری کارت‌به‌کارت واریز می‌کند (مثلاً بانک ملی، بانک ملت).",
  CARD_READER: "دستگاه کارت‌خوان (POS) فروشگاه یا پیک که پول مستقیم به حساب بانکی شما می‌نشیند.",
};

/** مدیریت صندوق‌ها، بانک‌ها و کارت‌خوان‌ها — محل‌هایی که مدیر موقع ثبت دریافت وجه هر سفارش انتخاب می‌کنه */
export default function PaymentAccountsAdmin({ initial = [] }) {
  const confirm = useConfirm();
  const [items, setItems] = useState(initial);
  const [error, setError] = useState("");
  useToastOnChange(error); // پیام خطا به‌صورت toast نشون داده می‌شه

  // مودال افزودن / ویرایش (form.id خالی باشه یعنی افزودن)
  const [formState, setForm] = useState(null);
  const form = useRetained(formState); // برای انیمیشن بسته‌شدن مودال
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => (e[name] ? { ...e, [name]: undefined } : e));
  }

  function openCreate() {
    setForm({ id: null, ...EMPTY });
    setErrors({});
    setError("");
  }

  function startEdit(a) {
    setForm({
      id: a.id,
      kind: a.kind,
      name: a.name,
      bankName: a.bankName ?? "",
      cardNumber: a.cardNumber ?? "",
      holderName: a.holderName ?? "",
      isActive: a.isActive,
    });
    setErrors({});
    setError("");
  }

  // آمار «جمع دریافتی» فقط از سرور میاد؛ بعد از ویرایش همون مقدار قبلی نگه داشته می‌شه
  const keepStats = (old, next) => ({ ...next, received: old?.received ?? 0, receivedCount: old?.receivedCount ?? 0 });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setError("");
    const payload = {
      kind: form.kind,
      name: form.name,
      bankName: form.kind === "CASH_BOX" ? null : form.bankName || null,
      cardNumber: form.kind === "BANK" ? form.cardNumber || null : null,
      holderName: form.kind === "BANK" ? form.holderName || null : null,
      isActive: form.isActive,
    };
    try {
      if (form.id) {
        const data = await api("PATCH", `/api/admin/payment-accounts/${form.id}`, payload);
        notify.success("تغییرات ذخیره شد.");
        setItems((list) => list.map((a) => (a.id === form.id ? keepStats(a, data.account) : a)));
      } else {
        const data = await api("POST", "/api/admin/payment-accounts", payload);
        notify.success("اضافه شد.");
        setItems((list) => [...list, data.account]);
      }
      setForm(null);
    } catch (err) {
      if (err.fields && Object.keys(err.fields).length) setErrors(err.fields);
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(a) {
    setError("");
    try {
      const data = await api("PATCH", `/api/admin/payment-accounts/${a.id}`, { isActive: !a.isActive });
      notify.success("وضعیت تغییر کرد.");
      setItems((list) => list.map((x) => (x.id === a.id ? keepStats(x, data.account) : x)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(a) {
    if (!(await confirm({ title: "حذف", description: `«${a.name}» حذف شود؟`, confirmText: "حذف" }))) return;
    setError("");
    try {
      await api("DELETE", `/api/admin/payment-accounts/${a.id}`);
      notify.success("حذف شد.");
      setItems((list) => list.filter((x) => x.id !== a.id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <PageHeader
        title="صندوق‌ها، بانک‌ها و کارت‌خوان‌ها"
        description={`محل‌های دریافت وجه — ${formatNumber(items.length)} مورد`}
      >
        <button type="button" onClick={openCreate} className={cn(btnPrimary, "h-10 w-auto px-4")}>
          <FaPlus size={14} />
          افزودن
        </button>
      </PageHeader>

      <p className="mb-4 rounded-xl bg-green-50 p-3 text-xs leading-6 text-green-800">
        بعد از تحویل سفارش، در صفحه‌ی همان سفارش می‌توانید ثبت کنید پولش به کدام صندوق، بانک یا کارت‌خوان رسیده است
        (نقدی ← صندوق، کارت به کارت ← بانک، کارت‌خوان ← کارت‌خوان).
      </p>

      <FormModal open={Boolean(formState)} onClose={() => setForm(null)} busy={busy} size="md" title={form?.id ? "ویرایش" : "افزودن صندوق / بانک / کارت‌خوان"}>
        {form && (
          <form onSubmit={submit} noValidate className="space-y-4">
            <Field label="نوع" htmlFor="pKind" error={errors.kind} required>
              {/* نوع بعد از ثبت قابل تغییر نیست تا سابقه‌ی دریافت‌ها قاطی نشه */}
              <Select id="pKind" value={form.kind} onChange={(e) => setField("kind", e.target.value)} disabled={Boolean(form.id)} className={inputCls(Boolean(errors.kind))}>
                {PAYMENT_ACCOUNT_KIND_OPTIONS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-xs leading-5 text-slate-400">{KIND_HINT[form.kind]}</p>
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="نام نمایشی" htmlFor="pName" error={errors.name} required>
                <input
                  id="pName"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder={form.kind === "CASH_BOX" ? "صندوق مغازه" : form.kind === "BANK" ? "بانک ملی — کارت اصلی" : "کارت‌خوان پیک ۱"}
                  className={inputCls(Boolean(errors.name))}
                />
              </Field>
              {form.kind !== "CASH_BOX" && (
                <Field label="نام بانک" htmlFor="pBank" error={errors.bankName}>
                  <input id="pBank" value={form.bankName} onChange={(e) => setField("bankName", e.target.value)} placeholder="ملی" className={inputCls(Boolean(errors.bankName))} />
                </Field>
              )}
              {form.kind === "BANK" && (
                <>
                  <Field label="شماره کارت یا شبا" htmlFor="pCard" error={errors.cardNumber}>
                    <input id="pCard" dir="ltr" inputMode="numeric" value={form.cardNumber} onChange={(e) => setField("cardNumber", e.target.value)} placeholder="6037 9975 ...." className={inputCls(Boolean(errors.cardNumber))} />
                  </Field>
                  <Field label="نام صاحب حساب" htmlFor="pHolder" error={errors.holderName}>
                    <input id="pHolder" value={form.holderName} onChange={(e) => setField("holderName", e.target.value)} className={inputCls(Boolean(errors.holderName))} />
                  </Field>
                </>
              )}
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setField("isActive", e.target.checked)} />
              فعال (قابل انتخاب هنگام ثبت دریافت وجه)
            </label>

            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={busy} className={cn(btnPrimary, "w-auto px-6")}>
                {busy ? <Spinner /> : form.id ? "ذخیره تغییرات" : "افزودن"}
              </button>
              <button type="button" onClick={() => setForm(null)} className={cn(btnSecondary, "w-auto px-6")}>
                انصراف
              </button>
            </div>
          </form>
        )}
      </FormModal>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-start text-xs">
            <thead>
              <tr className={theadRowCls}>
                <th className="py-2.5 ps-3 pe-3 font-medium">نام</th>
                <th className="py-2.5 pe-3 font-medium">نوع</th>
                <th className="py-2.5 pe-3 font-medium">جزئیات</th>
                <th className="py-2.5 pe-3 font-medium">جمع دریافتی</th>
                <th className="py-2.5 pe-3 font-medium">وضعیت</th>
                <th className="py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => {
                const meta = PAYMENT_ACCOUNT_KIND_META[a.kind];
                return (
                  <tr key={a.id} className={trCls}>
                    <td className="py-2.5 ps-3 pe-3 font-medium text-slate-800">{a.name}</td>
                    <td className="py-2.5 pe-3">
                      <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${meta?.color ?? ""}`}>{meta?.label ?? a.kind}</span>
                    </td>
                    <td className="py-2.5 pe-3 text-slate-600">
                      {[a.bankName && `بانک ${a.bankName}`, a.holderName].filter(Boolean).join(" — ") || "—"}
                      {a.cardNumber && (
                        <span dir="ltr" className="block text-end text-slate-400">
                          {toFaDigits(a.cardNumber)}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pe-3 text-slate-700">
                      {formatToman(a.received)}
                      <span className="block text-xs text-slate-400">{formatNumber(a.receivedCount)} دریافت</span>
                    </td>
                    <td className="py-2.5 pe-3">
                      <ActiveBadge active={a.isActive} />
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => startEdit(a)} aria-label={`ویرایش ${a.name}`} className="text-slate-500 hover:text-green-700">
                          <FaEdit size={14} />
                        </button>
                        <button type="button" onClick={() => toggleActive(a)} aria-label={a.isActive ? "غیرفعال‌کردن" : "فعال‌کردن"} className="text-slate-500 hover:text-green-700">
                          <FaPowerOff size={14} />
                        </button>
                        <button type="button" onClick={() => handleDelete(a)} aria-label={`حذف ${a.name}`} className="text-slate-500 hover:text-red-600">
                          <FaTrash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && <EmptyRow colSpan={6}>هنوز چیزی تعریف نشده. با «افزودن»، صندوق، بانک یا کارت‌خوان خود را بسازید.</EmptyRow>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
