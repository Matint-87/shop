"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FaMapMarkerAlt, FaPalette, FaPen, FaShieldAlt, FaShoppingBag, FaUser, FaWallet } from "react-icons/fa";
import { useAuth } from "@/components/auth/AuthProvider";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { toFaDigits } from "@/lib/phone";
import ProfileForm from "./ProfileForm";
import BirthDateRow from "./BirthDateRow";
import AddressList from "./AddressList";
import OrdersPanel from "./OrdersPanel";
import WalletPanel from "./WalletPanel";
import AccountSidebar from "./AccountSidebar";
import MobileProfileNav from "./MobileProfileNav";
import AppearancePanel from "./AppearancePanel";
import SecurityPanel from "./SecurityPanel";
import { notify } from "@/lib/toast";

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800" dir="ltr">
        {value || "—"}
      </span>
    </div>
  );
}

const GENDER_LABEL = { MALE: "آقا", FEMALE: "خانم" };

const SECTION_META = {
  orders: { title: "سفارش‌ها", icon: FaShoppingBag },
  wallet: { title: "کیف پول", icon: FaWallet },
  addresses: { title: "آدرس‌های من", icon: FaMapMarkerAlt },
  info: { title: "اطلاعات حساب کاربری", icon: FaUser },
  security: { title: "امنیت و دستگاه‌ها", icon: FaShieldAlt },
  appearance: { title: "ظاهر سایت", icon: FaPalette },
};

export default function ProfilePageClient({ user: initialUser, initialSection = "info" }) {
  const router = useRouter();
  const { setUser, logout } = useAuth();
  const confirm = useConfirm();
  const [user, setLocalUser] = useState(initialUser);
  const [section, setSection] = useState(initialSection);
  const [editingInfo, setEditingInfo] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  function handleSaved(updated) {
    setUser(updated);
    setLocalUser(updated);
    setEditingInfo(false);
  }

  function handleSelectSection(key) {
    setSection(key);
    setEditingInfo(false);
  }

  async function handleLogout() {
    // اول از کاربر می‌پرسیم مطمئنه یا نه (تأیید / انصراف)
    const ok = await confirm({
      title: "خروج از حساب کاربری",
      description: "آیا مطمئن هستید که می‌خواهید از حساب کاربری خود خارج شوید؟",
      confirmText: "تأیید و خروج",
      cancelText: "انصراف",
    });
    if (!ok) return;
    setLoggingOut(true);
    try {
      await logout();
    } catch (err) {
      notify.error(err?.message || "خروج انجام نشد. اینترنت خود را بررسی کنید و دوباره تلاش کنید.");
      setLoggingOut(false);
      return;
    }
    router.replace("/");
  }

  const meta = SECTION_META[section];
  const SectionIcon = meta.icon;

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-5">
      <MobileProfileNav
        user={user}
        active={section}
        onSelect={handleSelectSection}
        onLogout={handleLogout}
        loggingOut={loggingOut}
        onAvatarSaved={handleSaved}
      />
      <AccountSidebar
        user={user}
        active={section}
        onSelect={handleSelectSection}
        onLogout={handleLogout}
        loggingOut={loggingOut}
        onAvatarSaved={handleSaved}
      />

      <section className="min-w-0 flex-1 rounded-3xl border border-slate-200/70 bg-white p-4 shadow-soft sm:p-6 md:min-h-[calc(100dvh-10rem)]">
        {section === "info" ? (
          <>
            <div className="mb-3 flex items-center justify-between max-md:justify-start">
              <h2 className="hidden items-center gap-2 text-sm font-extrabold text-slate-800 md:flex">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-700">
                  <SectionIcon size={14} />
                </span>
                {meta.title}
              </h2>
              {!editingInfo && (
                <button
                  type="button"
                  onClick={() => setEditingInfo(true)}
                  className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700 transition hover:bg-green-100"
                >
                  <FaPen size={11} /> ویرایش
                </button>
              )}
            </div>
            {editingInfo ? (
              <ProfileForm user={user} submitLabel="ذخیره تغییرات" onSaved={handleSaved} onCancel={() => setEditingInfo(false)} />
            ) : (
              <div>
                <InfoRow label="نام و نام خانوادگی" value={user.firstName ? `${user.firstName} ${user.lastName}` : ""} />
                <InfoRow label="شماره موبایل" value={toFaDigits(user.phone)} />
                <InfoRow label="ایمیل" value={user.email} />
                <InfoRow label="کد ملی" value={user.nationalCode ? toFaDigits(user.nationalCode) : ""} />
                <BirthDateRow value={user.birthDate} />
                <InfoRow label="جنسیت" value={GENDER_LABEL[user.gender] ?? ""} />
              </div>
            )}
          </>
        ) : section === "addresses" ? (
          <>
            <h2 className="mb-4 hidden items-center gap-2 text-sm font-extrabold text-slate-800 md:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-700">
                <SectionIcon size={14} />
              </span>
              {meta.title}
            </h2>
            <AddressList />
          </>
        ) : section === "security" ? (
          <>
            <h2 className="mb-4 hidden items-center gap-2 text-sm font-extrabold text-slate-800 md:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-700">
                <SectionIcon size={14} />
              </span>
              {meta.title}
            </h2>
            <SecurityPanel phone={user.phone} />
          </>
        ) : section === "appearance" ? (
          <>
            <h2 className="mb-4 hidden items-center gap-2 text-sm font-extrabold text-slate-800 md:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-700">
                <SectionIcon size={14} />
              </span>
              {meta.title}
            </h2>
            <AppearancePanel />
          </>
        ) : section === "wallet" ? (
          <>
            <h2 className="mb-4 hidden items-center gap-2 text-sm font-extrabold text-slate-800 md:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-700">
                <SectionIcon size={14} />
              </span>
              {meta.title}
            </h2>
            <WalletPanel />
          </>
        ) : (
          <OrdersPanel />
        )}
      </section>
    </div>
  );
}
