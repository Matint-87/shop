"use client";

// اجزای مدرن فرم‌ها: ورودی آیکن‌دار، سکشن، انتخاب دو‌گزینه‌ای، کلید روشن/خاموش.
// همه‌ی رنگ‌ها از green-* / slate-* هستن، پس با تعویض پالت سایت (پنل ادمین) خودکار عوض می‌شن.
import { cn } from "@/lib/utils";
import { inputCls } from "@/components/ui/form";

/** ورودی با آیکن ابتدای فیلد (سمت راست در RTL) و محتوای اختیاری انتهای فیلد (مثلاً دکمه‌ی نمایش رمز) */
export function IconInput({ icon: Icon, trailing, error = false, className, ...props }) {
  return (
    <div className="relative">
      <input {...props} className={cn(inputCls(error), "peer", Icon && "pr-11", trailing && "pl-12", className)} />
      {Icon && (
        <Icon
          size={15}
          aria-hidden="true"
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors peer-focus:text-green-600"
        />
      )}
      {trailing}
    </div>
  );
}

/** گروه‌بندی فیلدها با تیتر آیکن‌دار */
export function FormSection({ icon: Icon, title, hint, children, className }) {
  return (
    <section className={cn("space-y-4", className)}>
      {/* بدون title → فقط فیلدها (وقتی صفحه/مرحله از قبل همون تیتر رو داره، تیتر دوم تکراریه) */}
      {title && (
        <div className="flex items-center gap-2.5">
          {Icon && (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700">
              <Icon size={14} />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="text-[13px] font-extrabold leading-5 text-slate-800">{title}</h2>
            {hint && <p className="text-[11px] leading-4 text-slate-500">{hint}</p>}
          </div>
          <span aria-hidden="true" className="h-px flex-1 bg-slate-200/80" />
        </div>
      )}
      {children}
    </section>
  );
}

/** انتخاب بین چند گزینه‌ی کوتاه (جایگزین radio) */
export function Segmented({ value, onChange, options, label }) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid h-12 gap-1 rounded-xl bg-slate-100 p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(active ? "" : o.value)}
            className={cn(
              "rounded-lg text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-600/20",
              active ? "bg-white text-green-700 shadow-sm ring-1 ring-slate-900/5" : "text-slate-500 hover:text-slate-700",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** ردیف کلید روشن/خاموش با عنوان و توضیح */
export function SwitchRow({ id, checked, onChange, title, description }) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 transition hover:border-slate-300 has-checked:border-green-600/40 has-checked:bg-green-50/50"
    >
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold leading-5 text-slate-800">{title}</p>
        {description && <p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p>}
      </div>
      <input id={id} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden="true"
        className="relative h-6 w-11 shrink-0 rounded-full bg-slate-300 transition-colors peer-checked:bg-green-600 peer-focus-visible:ring-4 peer-focus-visible:ring-green-600/25 after:absolute after:right-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:-translate-x-5"
      />
    </label>
  );
}
