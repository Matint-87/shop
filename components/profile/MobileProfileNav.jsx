"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { FaChevronLeft, FaSignOutAlt, FaStoreAlt } from "react-icons/fa";
import { toFaDigits } from "@/lib/phone";
import AvatarUpload from "./AvatarUpload";
import { NAV_ITEMS } from "./AccountSidebar";

/**
 * سربرگ پروفایل برای موبایل (زیر md): کارت کاربر (با دکمه‌ی خروج)، دکمه‌ی پنل مدیریت (فقط ادمین)
 * و تب‌های گردِ بخش‌ها. روی دسکتاپ به‌جاش AccountSidebar نمایش داده می‌شه.
 */
export default function MobileProfileNav({ user, active, onSelect, onLogout, loggingOut, onAvatarSaved }) {
  const isAdmin = user.role === "ADMIN";
  const navRef = useRef(null);

  // تب فعال همیشه توی دید باشه (بریده نشه)
  useEffect(() => {
    navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [active]);

  return (
    <div className="space-y-3 md:hidden">
      {/* کارت کاربر */}
      <div className="flex items-center gap-3 rounded-2xl border border-green-200/70 bg-green-50/70 p-3">
        <AvatarUpload user={user} size={48} onSaved={onAvatarSaved} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold text-slate-800">
            {user.firstName ? `${user.firstName} ${user.lastName}` : "کاربر"}
          </p>
          <p className="mt-0.5 text-right text-xs text-slate-500" dir="ltr">
            {toFaDigits(user.phone)}
          </p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          disabled={loggingOut}
          aria-label="خروج از حساب کاربری"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 transition hover:text-rose-600 disabled:opacity-60"
        >
          <FaSignOutAlt size={15} />
        </button>
      </div>

      {isAdmin && (
        <Link
          href="/admin"
          className="flex items-center gap-3 rounded-2xl bg-linear-to-l from-green-900 to-green-700 p-3 text-white shadow-brand active:scale-[0.99]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
            <FaStoreAlt size={16} />
          </span>
          <span className="min-w-0 flex-1 text-sm font-extrabold">ورود به پنل مدیریت</span>
          <FaChevronLeft size={12} />
        </Link>
      )}

      {/* تب‌های بخش‌ها: اسکرول افقی */}
      <nav
        ref={navRef}
        aria-label="بخش‌های حساب کاربری"
        className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(item.key)}
              aria-current={isActive ? "page" : undefined}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition ${
                isActive
                  ? "bg-green-700 text-white shadow-brand"
                  : "border border-slate-200 bg-white text-slate-600"
              }`}
            >
              <Icon size={12} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
