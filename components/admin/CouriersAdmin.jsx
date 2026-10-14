"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { FaEdit, FaPlus, FaPowerOff, FaTrash } from "react-icons/fa";
import { Field, Spinner, btnPrimary, btnSecondary, inputCls } from "@/components/ui/form";
import AdminFilters from "@/components/admin/AdminFilters";
import ListFooter from "@/components/admin/ListFooter";
import { useInfiniteList } from "@/components/admin/useInfiniteList";
import { ActiveBadge, Card, EmptyRow, PageHeader, theadRowCls, trCls } from "@/components/admin/ui";
import { api } from "@/lib/api-client";
import { formatNumber } from "@/lib/format";
import { toFaDigits } from "@/lib/phone";
import { notify, useToastOnChange } from "@/lib/toast";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import FormModal, { useRetained } from "@/components/admin/FormModal";

const EMPTY = { name: "", phone: "", vehicle: "", isActive: true };

export default function CouriersAdmin({ filters, initial }) {
  const confirm = useConfirm();
  const list = useInfiniteList({ endpoint: "/api/admin/couriers", itemsKey: "couriers", filters, initial });
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

  function startEdit(c) {
    setForm({ id: c.id, name: c.name, phone: c.phone, vehicle: c.vehicle ?? "", isActive: c.isActive });
    setErrors({});
    setError("");
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setError("");
    const payload = { name: form.name, phone: form.phone, vehicle: form.vehicle || null, isActive: form.isActive };
    try {
      if (form.id) {
        const data = await api("PATCH", `/api/admin/couriers/${form.id}`, payload);
        notify.success("تغییرات پیک ذخیره شد.");
        list.patchItem(form.id, data.courier);
      } else {
        await api("POST", "/api/admin/couriers", payload);
        notify.success("پیک جدید اضافه شد.");
        list.reload();
      }
      setForm(null);
    } catch (err) {
      if (err.fields && Object.keys(err.fields).length) setErrors(err.fields);
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(c) {
    setError("");
    try {
      const data = await api("PATCH", `/api/admin/couriers/${c.id}`, { isActive: !c.isActive });
      notify.success("وضعیت پیک تغییر کرد.");
      list.patchItem(c.id, data.courier);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(c) {
    if (!(await confirm({ title: "حذف پیک", description: `پیک «${c.name}» حذف شود؟`, confirmText: "حذف" }))) return;
    setError("");
    try {
      await api("DELETE", `/api/admin/couriers/${c.id}`);
      notify.success("پیک حذف شد.");
      list.removeItem(c.id);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <PageHeader title="پیک‌ها" description={`پیک‌های تحویل سفارش — ${formatNumber(list.total)} پیک`}>
      <button type="button" onClick={openCreate} className={cn(btnPrimary, "h-10 w-auto px-4")}>
        <FaPlus size={14} />
        پیک جدید
      </button>
      </PageHeader>


      <FormModal
        open={Boolean(formState)}
        onClose={() => setForm(null)}
        busy={busy}
        size="md"
        title={form?.id ? "ویرایش پیک" : "پیک جدید"}
      >
        {form && (
          <form onSubmit={submit} noValidate className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="نام پیک" htmlFor="cName" error={errors.name} required>
                <input id="cName" value={form.name} onChange={(e) => setField("name", e.target.value)} className={inputCls(Boolean(errors.name))} />
              </Field>
              <Field label="موبایل" htmlFor="cPhone" error={errors.phone} required>
                <input id="cPhone" dir="ltr" value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="09123456789" className={inputCls(Boolean(errors.phone))} />
              </Field>
              <Field label="وسیله‌ی نقلیه" htmlFor="cVehicle" error={errors.vehicle}>
                <input id="cVehicle" value={form.vehicle} onChange={(e) => setField("vehicle", e.target.value)} placeholder="موتور" className={inputCls(Boolean(errors.vehicle))} />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setField("isActive", e.target.checked)} />
              فعال
            </label>

            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={busy} className={cn(btnPrimary, "w-auto px-6")}>
                {busy ? <Spinner /> : form.id ? "ذخیره تغییرات" : "افزودن پیک"}
              </button>
              <button type="button" onClick={() => setForm(null)} className={cn(btnSecondary, "w-auto px-6")}>
                انصراف
              </button>
            </div>
          </form>
        )}
      </FormModal>

      <AdminFilters
        placeholder="نام یا موبایل پیک…"
        selects={[
          {
            name: "status",
            label: "وضعیت",
            options: [
              { value: "active", label: "فعال" },
              { value: "inactive", label: "غیرفعال" },
            ],
          },
        ]}
      />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-start text-xs">
            <thead>
              <tr className={theadRowCls}>
                <th className="py-2.5 ps-3 pe-3 font-medium">نام</th>
                <th className="py-2.5 pe-3 font-medium">موبایل</th>
                <th className="py-2.5 pe-3 font-medium">وسیله</th>
                <th className="py-2.5 pe-3 font-medium">سفارش‌ها</th>
                <th className="py-2.5 pe-3 font-medium">وضعیت</th>
                <th className="py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {list.items.map((c) => (
                  <tr key={c.id} className={trCls}>
                    <td className="py-2.5 ps-3 pe-3 font-medium text-slate-800">{c.name}</td>
                    <td className="py-2.5 pe-3 text-slate-600" dir="ltr">
                      <span className="block text-end">{toFaDigits(c.phone)}</span>
                    </td>
                    <td className="py-2.5 pe-3 text-slate-600">{c.vehicle ?? "—"}</td>
                    <td className="py-2.5 pe-3 text-slate-600">{formatNumber(c.orderCount)}</td>
                    <td className="py-2.5 pe-3">
                      <ActiveBadge active={c.isActive} />
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => startEdit(c)} aria-label={`ویرایش ${c.name}`} className="text-slate-500 hover:text-green-700">
                          <FaEdit size={14} />
                        </button>
                        <button type="button" onClick={() => toggleActive(c)} aria-label={c.isActive ? "غیرفعال‌کردن" : "فعال‌کردن"} className="text-slate-500 hover:text-green-700">
                          <FaPowerOff size={14} />
                        </button>
                        <button type="button" onClick={() => handleDelete(c)} aria-label={`حذف ${c.name}`} className="text-slate-500 hover:text-red-600">
                          <FaTrash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              {list.items.length === 0 && !list.loading && <EmptyRow colSpan={6}>پیکی پیدا نشد.</EmptyRow>}
            </tbody>
          </table>
        </div>
        <ListFooter list={list} />
      </Card>
      <p className="mt-3 text-xs text-slate-400">
        پیک را از صفحه‌ی جزئیات هر سفارش تعیین کنید. <Link href="/admin/orders" className="text-green-700 hover:underline">رفتن به سفارش‌ها</Link>
      </p>
    </div>
  );
}
