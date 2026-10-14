"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { FaCamera, FaEdit, FaPlus, FaShoppingBasket, FaTrash } from "react-icons/fa";
import { Field, Spinner, btnPrimary, btnSecondary, inputCls } from "@/components/ui/form";
import ListFooter from "@/components/admin/ListFooter";
import { useInfiniteList } from "@/components/admin/useInfiniteList";
import { ActiveBadge, Card, EmptyRow, PageHeader, theadRowCls, trCls } from "@/components/admin/ui";
import { api, ApiClientError } from "@/lib/api-client";
import { formatNumber } from "@/lib/format";
import { notify, useToastOnChange } from "@/lib/toast";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import FormModal, { useRetained } from "@/components/admin/FormModal";

const EMPTY = { name: "", sortOrder: "0", imageUrl: "", isActive: true };

async function uploadCategoryIcon(file) {
  const body = new FormData();
  body.append("image", file);
  let res;
  try {
    res = await fetch("/api/categories/upload", { method: "POST", body, cache: "no-store" });
  } catch {
    throw new ApiClientError("ارتباط با سرور برقرار نشد.");
  }
  let data = null;
  try {
    data = await res.json();
  } catch {}
  if (!res.ok || !data?.ok) throw new ApiClientError(data?.error || "آپلود آیکن با خطا مواجه شد.");
  return data;
}

/** دایره‌ی آیکن دسته؛ همون ظاهری که توی بخش «قفسه‌ها»ی سایت داره */
function IconCircle({ url, size = "h-10 w-10" }) {
  return (
    <span className={cn("relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 ring-1 ring-black/5", size)}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-contain p-1" />
      ) : (
        <FaShoppingBasket size={14} className="text-slate-300" />
      )}
    </span>
  );
}

export default function CategoriesAdmin({ initial }) {
  const confirm = useConfirm();
  // لیست دسته‌ها: ۱۰ تای اول از سرور، بقیه ۱۰تا۱۰تا با اسکرول
  const list = useInfiniteList({ endpoint: "/api/admin/categories", itemsKey: "categories", initial });
  const [error, setError] = useState("");
  useToastOnChange(error); // پیام خطا به‌صورت toast نشون داده می‌شه

  // مودال افزودن / ویرایش (form.id خالی باشه یعنی افزودن)
  const [formState, setForm] = useState(null);
  const form = useRetained(formState); // برای انیمیشن بسته‌شدن مودال
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => (e[name] ? { ...e, [name]: undefined } : e));
  }

  function openCreate() {
    setForm({ id: null, ...EMPTY, sortOrder: String(list.total + 1) });
    setErrors({});
    setError("");
  }

  function startEdit(c) {
    setForm({ id: c.id, name: c.name, sortOrder: String(c.sortOrder), imageUrl: c.imageUrl ?? "", isActive: c.isActive });
    setErrors({});
    setError("");
  }

  async function handleIconPick(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const data = await uploadCategoryIcon(file);
      setField("imageUrl", data.imageUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setError("");
    const payload = {
      name: form.name,
      sortOrder: form.sortOrder === "" ? 0 : form.sortOrder,
      imageUrl: form.imageUrl || null,
      isActive: form.isActive,
    };
    try {
      if (form.id) {
        await api("PATCH", `/api/categories/${form.id}`, payload);
        notify.success("تغییرات دسته ذخیره شد.");
      } else {
        await api("POST", "/api/categories", payload);
        notify.success("دسته‌ی جدید اضافه شد.");
      }
      setForm(null);
      list.reload(); // با تغییر «ترتیب نمایش» جای ردیف‌ها عوض می‌شه، پس لیست دوباره مرتب گرفته می‌شه
    } catch (err) {
      if (err.fields && Object.keys(err.fields).length) setErrors(err.fields);
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(c) {
    if (!(await confirm({ title: "حذف دسته", description: `دسته‌ی «${c.name}» حذف شود؟`, confirmText: "حذف" }))) return;
    setError("");
    try {
      await api("DELETE", `/api/categories/${c.id}`);
      notify.success("دسته حذف شد.");
      list.removeItem(c.id);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <PageHeader
        title="دسته‌بندی‌ها"
        description={`ترتیب نمایش عدد کوچک‌تر یعنی بالاتر در سایت — ${formatNumber(list.total)} دسته`}
      >
      <button type="button" onClick={openCreate} className={cn(btnPrimary, "h-10 w-auto px-4")}>
        <FaPlus size={14} />
        دسته‌ی جدید
      </button>
      </PageHeader>


      <FormModal
        open={Boolean(formState)}
        onClose={() => setForm(null)}
        busy={busy}
        size="md"
        title={form?.id ? "ویرایش دسته" : "دسته‌ی جدید"}
      >
        {form && (
          <form onSubmit={submit} noValidate className="space-y-4">
            {/* آیکن دسته: همون چیزی که مشتری توی بخش «قفسه‌ها» می‌بینه */}
            <Field label="آیکن دسته" error={errors.imageUrl} hint="عکس مربع با پس‌زمینه‌ی شفاف یا ساده بهترین نتیجه رو می‌ده (JPG، PNG یا WebP؛ تا ۴ مگابایت)">
              <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200/70">
                <label className="group relative cursor-pointer" title="انتخاب آیکن">
                  <IconCircle url={form.imageUrl} size="h-20 w-20" />
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-900/45 text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                    {uploading ? <Spinner /> : <FaCamera size={16} />}
                  </span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleIconPick} disabled={uploading} />
                </label>
                <div className="min-w-0 space-y-1.5">
                  <p className="truncate text-xs font-bold text-slate-700">{form.name || "نام دسته"}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className={cn(btnSecondary, "h-9 w-auto cursor-pointer px-3 text-xs")}>
                      {uploading ? <Spinner /> : form.imageUrl ? "تغییر آیکن" : "انتخاب آیکن"}
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleIconPick} disabled={uploading} />
                    </label>
                    {form.imageUrl && (
                      <button
                        type="button"
                        onClick={() => setField("imageUrl", "")}
                        disabled={uploading}
                        className="h-9 rounded-lg px-3 text-xs font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                      >
                        حذف آیکن
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="نام دسته" htmlFor="catName" error={errors.name} required>
                <input id="catName" value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="مثلاً تنقلات" className={inputCls(Boolean(errors.name))} />
              </Field>
              <Field label="ترتیب نمایش" htmlFor="catSort" error={errors.sortOrder} hint="عدد کوچک‌تر یعنی بالاتر در سایت">
                <input id="catSort" type="number" value={form.sortOrder} onChange={(e) => setField("sortOrder", e.target.value)} className={inputCls(Boolean(errors.sortOrder))} />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setField("isActive", e.target.checked)} />
              فعال
            </label>

            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={busy || uploading} className={cn(btnPrimary, "w-auto px-6")}>
                {busy ? <Spinner /> : form.id ? "ذخیره تغییرات" : "افزودن دسته"}
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
          <table className="w-full min-w-[560px] text-start text-xs">
            <thead>
              <tr className={theadRowCls}>
                <th className="py-2.5 ps-3 pe-3 font-medium">دسته</th>
                <th className="py-2.5 pe-3 font-medium">ترتیب</th>
                <th className="py-2.5 pe-3 font-medium">محصولات</th>
                <th className="py-2.5 pe-3 font-medium">وضعیت</th>
                <th className="py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {list.items.map((c) => (
                  <tr key={c.id} className={trCls}>
                    <td className="py-2.5 ps-3 pe-3 font-medium text-slate-800">
                      <span className="flex items-center gap-3">
                        <IconCircle url={c.imageUrl} />
                        {c.name}
                      </span>
                    </td>
                    <td className="py-2.5 pe-3 text-slate-600">{formatNumber(c.sortOrder)}</td>
                    <td className="py-2.5 pe-3 text-slate-600">{formatNumber(c.productCount)}</td>
                    <td className="py-2.5 pe-3">
                      <ActiveBadge active={c.isActive} />
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => startEdit(c)}
                          aria-label={`ویرایش ${c.name}`}
                          className="text-slate-500 hover:text-green-700"
                        >
                          <FaEdit size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c)}
                          aria-label={`حذف ${c.name}`}
                          className="text-slate-500 hover:text-red-600"
                        >
                          <FaTrash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              {list.items.length === 0 && !list.loading && (
                <EmptyRow colSpan={5}>هنوز دسته‌ای ثبت نشده. با «دسته‌ی جدید» اولین دسته را بسازید.</EmptyRow>
              )}
            </tbody>
          </table>
        </div>
        <ListFooter list={list} />
      </Card>
    </div>
  );
}
