"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { FaMapMarkerAlt, FaUser } from "react-icons/fa";
import { api } from "@/lib/api-client";
import { useAuth } from "@/components/auth/AuthProvider";
import { btnSecondary } from "@/components/ui/form";
import AddressForm from "@/components/address/AddressForm";
import BackButton from "@/components/BackButton";
import { StepHeader, StepPane, StepProgress } from "@/components/auth/AuthUi";
import ProfileForm from "./ProfileForm";

const STEPS = [
  { key: 1, label: "اطلاعات شخصی", icon: FaUser },
  { key: 2, label: "آدرس گیرنده", icon: FaMapMarkerAlt },
];

export default function CompleteProfileWizard({ user: initialUser, next }) {
  const router = useRouter();
  const { setUser } = useAuth();
  const [user, setLocalUser] = useState(initialUser);
  const [step, setStep] = useState(initialUser.profileCompleted ? 2 : 1);
  const [hasAddress, setHasAddress] = useState(null); // null = در حال بررسی
  const [checkingAddress, setCheckingAddress] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api("GET", "/api/addresses")
      .then((data) => {
        if (cancelled) return;
        const has = data.addresses.length > 0;
        setHasAddress(has);
        // اگه هر دو قسمت از قبل کامل بودن، مستقیم برو ادامه (مثلاً کاربر دوباره این لینک رو باز کرده)
        if (initialUser.profileCompleted && has) router.replace(next);
      })
      .finally(() => !cancelled && setCheckingAddress(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleProfileSaved(updatedUser) {
    setUser(updatedUser);
    setLocalUser(updatedUser);
    setStep(2);
  }

  function goToApp() {
    router.replace(next);
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-pop sm:p-7">
      {/* مرحله‌ی ۲ → برگشت به مرحله‌ی ۱؛ مرحله‌ی ۱ → صفحه‌ی قبلی */}
      <div className="mb-5">
        {step === 2 ? (
          <BackButton variant="inline" hideOn={[]} label="مرحله‌ی قبل" onClick={() => setStep(1)} />
        ) : (
          <BackButton variant="inline" hideOn={[]} fallback="/" />
        )}
      </div>

      <StepProgress steps={STEPS} current={step - 1} className="mb-7 px-1 sm:px-6" />

      {step === 1 && (
        <StepPane key="profile" className="space-y-6">
          <StepHeader icon={FaUser} title="اطلاعات شخصی">
            فقط نام و نام خانوادگی لازم است؛ بقیه‌ی موارد اختیاری‌اند.
          </StepHeader>
          <ProfileForm user={user} submitLabel="ذخیره و ادامه" onSaved={handleProfileSaved} />
        </StepPane>
      )}

      {step === 2 && (
        <StepPane key="address" className="space-y-6">
          <StepHeader icon={FaMapMarkerAlt} title="آدرس تحویل سفارش">
            محل دقیق را روی نقشه مشخص کنید؛ بعداً از پروفایل می‌توانید آدرس‌های بیشتری اضافه کنید.
          </StepHeader>
          {checkingAddress ? (
            <div className="space-y-3" aria-busy="true" aria-label="در حال بررسی">
              <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
              <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
            </div>
          ) : (
            <AddressForm onSaved={goToApp} />
          )}
          {hasAddress && (
            <button type="button" onClick={goToApp} className={cn(btnSecondary, "w-full")}>
              فعلاً رد شو (قبلاً آدرس ثبت کرده‌اید)
            </button>
          )}
        </StepPane>
      )}
    </div>
  );
}
