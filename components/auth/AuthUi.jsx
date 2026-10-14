"use client";

import { FaCheck } from "react-icons/fa";
import { cn } from "@/lib/utils";

/**
 * نوار مراحل (ثبت‌نام / تکمیل اطلاعات). steps: [{ key, label, icon }]، current: ایندکس مرحله‌ی فعلی (از صفر).
 * مرحله‌های تمام‌شده تیک می‌خورن و خط بینشون با انیمیشن پر می‌شه؛ مرحله‌ی فعلی حلقه‌ی برند داره.
 */
export function StepProgress({ steps, current, className }) {
  return (
    <ol className={cn("flex items-start", className)} aria-label="مراحل ثبت‌نام">
      {steps.map((s, i) => {
        const state = i < current ? "done" : i === current ? "current" : "todo";
        const Icon = s.icon;
        const last = i === steps.length - 1;
        return (
          <li key={s.key} aria-current={state === "current" ? "step" : undefined} className={cn("flex items-start", !last && "flex-1")}>
            <div className="flex w-9 flex-col items-center">
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-300",
                  state === "done" && "border-green-600 bg-green-600 text-white",
                  state === "current" && "border-green-600 bg-white text-green-700 ring-4 ring-green-600/15",
                  state === "todo" && "border-slate-200 bg-slate-100 text-slate-400",
                )}
              >
                {state === "done" ? <FaCheck size={12} /> : <Icon size={14} />}
              </span>
              <span
                className={cn(
                  "mt-1.5 w-20 text-center text-[11px] leading-4 transition-colors",
                  state === "current" ? "font-bold text-slate-800" : state === "done" ? "font-medium text-slate-600" : "text-slate-400",
                )}
              >
                {s.label}
              </span>
            </div>
            {!last && (
              <span aria-hidden="true" className="mx-1.5 mt-[17px] h-0.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                <span
                  className={cn(
                    "block h-full w-full origin-right bg-green-600 transition-transform duration-500 ease-out",
                    i < current ? "scale-x-100" : "scale-x-0",
                  )}
                />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** سربرگ هر مرحله: آیکن + عنوان + توضیح کوتاه */
export function StepHeader({ icon: Icon, title, children }) {
  return (
    <div className="flex items-start gap-3.5">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-green-700 ring-1 ring-green-600/10">
        <Icon size={20} />
      </span>
      <div className="min-w-0 pt-0.5">
        <h1 className="text-lg font-extrabold leading-7 text-slate-800">{title}</h1>
        {children && <p className="mt-1 text-xs leading-6 text-slate-500">{children}</p>}
      </div>
    </div>
  );
}

/** انیمیشن ورود هر مرحله (با key عوض می‌شه تا موقع تغییر مرحله دوباره اجرا بشه) */
export function StepPane({ children, className }) {
  return <div className={cn("animate-in fade-in slide-in-from-bottom-2 duration-300", className)}>{children}</div>;
}
