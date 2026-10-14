"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { FaEdit, FaPlus, FaTrash } from "react-icons/fa";
import { Field, Spinner, btnPrimary, btnSecondary, inputCls } from "@/components/ui/form";
import ListFooter from "@/components/admin/ListFooter";
import { useInfiniteList } from "@/components/admin/useInfiniteList";
import { ActiveBadge, Card, EmptyRow, PageHeader, theadRowCls, trCls } from "@/components/admin/ui";
import { api } from "@/lib/api-client";
import { formatNumber } from "@/lib/format";
import { notify, useToastOnChange } from "@/lib/toast";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import FormModal, { useRetained } from "@/components/admin/FormModal";

const EMPTY = { name: "", isActive: true };

export default function BrandsAdmin({ initial }) {
  const confirm = useConfirm();
  const list = useInfiniteList({ endpoint: "/api/admin/brands", itemsKey: "brands", initial });
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

  function startEdit(b) {
    setForm({ id: b.id, name: b.name, isActive: b.isActive });
    setErrors({});
    setError("");
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setError("");
    const payload = { name: form.name, isActive: form.isActive };
    try {
      if (form.id) {
        await api("PATCH", `/api/brands/${form.id}`, payload);
        notify.success("تغییرات برند ذخیره شد.");
      } else {
        await api("POST", "/api/brands", payload);
        notify.success("برند جدید اضافه شد.");
      }
      setForm(null);
      list.reload(); // لیست بر اساس نام مرتب می‌شه، پس از اول گرفته می‌شه
    } catch (err) {
      if (err.fields && Object.keys(err.fields).length) setErrors(err.fields);
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(b) {
    const warn = b.productCount > 0 ? `\nمحصولات این برند (${formatNumber(b.productCount)} عدد) بدون برند می‌شوند.` : "";
    if (!(await confirm({ title: "حذف برند", description: `برند «${b.name}» حذف شود؟${warn}`, confirmText: "حذف" }))) return;
    setError("");
    try {
      await api("DELETE", `/api/brands/${b.id}`);
      notify.success("برند حذف شد.");
      list.removeItem(b.id);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <PageHeader
        title="برندها"
        description={`برند محصولات فروشگاه — ${formatNumber(list.total)} برند`}
      >
      <button type="button" onClick={openCreate} className={cn(btnPrimary, "h-10 w-auto px-4")}>
        <FaPlus size={14} />
        برند جدید
      </button>
      </PageHeader>


      <FormModal
        open={Boolean(formState)}
        onClose={() => setForm(null)}
        busy={busy}
        size="sm"
        title={form?.id ? "ویرایش برند" : "برند جدید"}
      >
        {form && (
          <form onSubmit={submit} noValidate className="space-y-4">
            <Field label="نام برند" htmlFor="brandName" error={errors.name} required>
              <input id="brandName" value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="مثلاً میهن" className={inputCls(Boolean(errors.name))} />
            </Field>
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setField("isActive", e.target.checked)} />
              فعال
            </label>

            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={busy} className={cn(btnPrimary, "w-auto px-6")}>
                {busy ? <Spinner /> : form.id ? "ذخیره تغییرات" : "افزودن برند"}
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
          <table className="w-full min-w-[480px] text-start text-xs">
            <thead>
              <tr className={theadRowCls}>
                <th className="py-2.5 ps-3 pe-3 font-medium">نام</th>
                <th className="py-2.5 pe-3 font-medium">محصولات</th>
                <th className="py-2.5 pe-3 font-medium">وضعیت</th>
                <th className="py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {list.items.map((b) => (
                  <tr key={b.id} className={trCls}>
                    <td className="py-2.5 ps-3 pe-3 font-medium text-slate-800">{b.name}</td>
                    <td className="py-2.5 pe-3 text-slate-600">{formatNumber(b.productCount)}</td>
                    <td className="py-2.5 pe-3">
                      <ActiveBadge active={b.isActive} />
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => startEdit(b)}
                          aria-label={`ویرایش ${b.name}`}
                          className="text-slate-500 hover:text-green-700"
                        >
                          <FaEdit size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(b)}
                          aria-label={`حذف ${b.name}`}
                          className="text-slate-500 hover:text-red-600"
                        >
                          <FaTrash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              {list.items.length === 0 && !list.loading && (
                <EmptyRow colSpan={4}>هنوز برندی ثبت نشده. با «برند جدید» اولین برند را بسازید.</EmptyRow>
              )}
            </tbody>
          </table>
        </div>
        <ListFooter list={list} />
      </Card>
    </div>
  );
}
