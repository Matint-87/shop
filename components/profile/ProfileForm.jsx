"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { toEnglishDigits } from "@/lib/phone";
import { FaEnvelope, FaIdCard, FaUser, FaUserFriends } from "react-icons/fa";
import { Field, Spinner, btnPrimary, btnSecondary } from "@/components/ui/form";
import { FormSection, IconInput, Segmented, SwitchRow } from "@/components/ui/form-extras";
import { cn } from "@/lib/utils";
import JalaliDateField from "./JalaliDateField";
import { notify, useToastOnChange } from "@/lib/toast";

const GENDERS = [
  { value: "MALE", label: "آقا" },
  { value: "FEMALE", label: "خانم" },
];

export default function ProfileForm({ user, submitLabel = "ذخیره و ادامه", onSaved, onCancel }) {
  const [form, setForm] = useState({
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    email: user.email ?? "",
    nationalCode: user.nationalCode ?? "",
    birthDate: user.birthDate ?? "",
    gender: user.gender ?? "",
    smsPromoOptIn: user.smsPromoOptIn ?? false,
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  useToastOnChange(formError); // پیام خطا به‌صورت toast نشون داده می‌شه
  const [busy, setBusy] = useState(false);

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => (e[name] ? { ...e, [name]: undefined } : e));
  }

  async function submit(e) {
    e.preventDefault();
    setFormError("");
    setBusy(true);
    try {
      const data = await api("PUT", "/api/profile", {
        ...form,
        gender: form.gender || null,
        nationalCode: toEnglishDigits(form.nationalCode),
      });
      notify.success("اطلاعات شما ذخیره شد.");
      onSaved?.(data.user);
    } catch (err) {
      if (err.fields && Object.keys(err.fields).length) setErrors(err.fields);
      else setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const optional = <span className="ms-2 inline-block rounded-full bg-slate-100 px-2 py-0.5 align-middle text-[10px] font-medium leading-4 text-slate-500">اختیاری</span>;

  return (
    <form onSubmit={submit} noValidate className="space-y-7">
      <FormSection icon={FaUser} title="مشخصات شما" hint="برای ثبت سفارش و صدور فاکتور">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="نام" htmlFor="firstName" error={errors.firstName} required>
            <IconInput
              icon={FaUser}
              id="firstName"
              autoFocus
              autoComplete="given-name"
              value={form.firstName}
              error={Boolean(errors.firstName)}
              onChange={(e) => setField("firstName", e.target.value)}
            />
          </Field>
          <Field label="نام خانوادگی" htmlFor="lastName" error={errors.lastName} required>
            <IconInput
              icon={FaUserFriends}
              id="lastName"
              autoComplete="family-name"
              value={form.lastName}
              error={Boolean(errors.lastName)}
              onChange={(e) => setField("lastName", e.target.value)}
            />
          </Field>
          <Field label={<>جنسیت{optional}</>} className="sm:col-span-2">
            <Segmented label="جنسیت" value={form.gender} onChange={(v) => setField("gender", v)} options={GENDERS} />
          </Field>
        </div>
      </FormSection>

      <FormSection icon={FaIdCard} title="اطلاعات تکمیلی" hint="می‌توانید بعداً هم از پروفایل کامل کنید">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={<>کد ملی{optional}</>} htmlFor="nationalCode" error={errors.nationalCode}>
            <IconInput
              icon={FaIdCard}
              id="nationalCode"
              dir="ltr"
              inputMode="numeric"
              value={form.nationalCode}
              error={Boolean(errors.nationalCode)}
              onChange={(e) => setField("nationalCode", toEnglishDigits(e.target.value).replace(/\D/g, "").slice(0, 10))}
              className="text-left tracking-wider"
            />
          </Field>
          <Field label={<>ایمیل{optional}</>} htmlFor="email" error={errors.email}>
            <IconInput
              icon={FaEnvelope}
              id="email"
              type="email"
              dir="ltr"
              autoComplete="email"
              value={form.email}
              error={Boolean(errors.email)}
              onChange={(e) => setField("email", e.target.value)}
              className="text-left"
            />
          </Field>
          <div className="sm:col-span-2">
            <JalaliDateField value={form.birthDate} onChange={(v) => setField("birthDate", v)} error={errors.birthDate} />
          </div>
        </div>
      </FormSection>

      <SwitchRow
        id="smsPromoOptIn"
        checked={form.smsPromoOptIn}
        onChange={(v) => setField("smsPromoOptIn", v)}
        title="پیامک تخفیف و پیشنهاد ویژه"
        description="از جدیدترین تخفیف‌ها زودتر باخبر شوید. هر زمان بخواهید قابل خاموش‌کردن است."
      />

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className={cn(btnPrimary, onCancel && "w-auto flex-1")}>
          {busy && <Spinner />}
          {submitLabel}
        </button>
        {/* دکمه‌ی انصراف فقط وقتی والد onCancel بده (حالت «ویرایش»؛ نه ویزارد اول ثبت‌نام) */}
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={busy} className={cn(btnSecondary, "w-auto px-6")}>
            انصراف
          </button>
        )}
      </div>
    </form>
  );
}
