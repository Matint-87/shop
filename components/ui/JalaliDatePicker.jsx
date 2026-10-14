"use client";

// انتخاب‌گر تاریخ شمسی (تقویم بازشونده) — جایگزین سه‌تا <select> روز/ماه/سال.
// ورودی/خروجی همیشه «کلید روز» میلادی ("2008-04-09") هست؛ کاربر فقط تاریخ شمسی می‌بینه و دیتابیس/URL دست‌نخورده می‌مونن.
// نما: روزها ← کلیک روی ماه/سال → انتخاب ماه ← کلیک روی سال → انتخاب سال (برای تاریخ تولد خیلی سریع‌تر از اسکرول).
// موبایل: کشوی پایین صفحه | دسکتاپ: پاپ‌اور زیر فیلد.
import { useEffect, useMemo, useRef, useState } from "react";
import { FaCalendarAlt, FaChevronLeft, FaChevronRight, FaTimes } from "react-icons/fa";
import { inputCls } from "@/components/ui/form";
import { JALALI_MONTHS, currentJalaliYear, formatJalaliKey, isoToJalali, jalaliMonthLength, jalaliToIso, tehranTodayKey } from "@/lib/jalali";
import { toFaDigits } from "@/lib/phone";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["ش", "ی", "د", "س", "چ", "پ", "ج"]; // هفته از شنبه شروع می‌شه
const WEEKDAY_NAMES = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

const num = (v) => Number(v);

/** ایندکس روز هفته‌ی اولِ ماه (۰ = شنبه) */
function firstWeekdayIndex(jy, jm) {
  const key = jalaliToIso(jy, jm, 1);
  const [gy, gm, gd] = key.split("-").map(Number);
  const js = new Date(Date.UTC(gy, gm - 1, gd)).getUTCDay(); // 0 = یکشنبه … 6 = شنبه
  return (js + 1) % 7;
}

const keyOf = (y, m, d) => jalaliToIso(y, m, d) ?? "";

export default function JalaliDatePicker({
  value,
  onChange,
  id,
  label, // فقط برای aria-label
  placeholder = "انتخاب تاریخ",
  minKey = "", // کمترین تاریخ مجاز (کلید روز میلادی)
  maxKey = "", // بیشترین تاریخ مجاز
  defaultViewKey = "", // وقتی هنوز چیزی انتخاب نشده تقویم دور این تاریخ باز بشه
  allowClear = true,
  error,
  compact = false, // قد کوتاه‌تر برای نوار فیلتر پنل مدیریت
  className,
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState("days"); // days | months | years
  const [cursor, setCursor] = useState({ y: currentJalaliYear(), m: 1 });
  const rootRef = useRef(null);
  const yearsRef = useRef(null);

  const today = tehranTodayKey();
  const sel = value ? isoToJalali(value) : null; // رشته‌ها
  const selY = sel ? num(sel.y) : 0;
  const selM = sel ? num(sel.m) : 0;
  const selD = sel ? num(sel.d) : 0;
  const t = isoToJalali(today);

  const thisYear = currentJalaliYear();
  const minYear = minKey ? num(isoToJalali(minKey).y) : thisYear - 100;
  const maxYear = maxKey ? num(isoToJalali(maxKey).y) : thisYear + 5;

  const outOfRange = (k) => Boolean((minKey && k < minKey) || (maxKey && k > maxKey));

  function openPicker() {
    let y, m;
    if (sel) {
      y = selY;
      m = selM;
    } else {
      const base = isoToJalali(defaultViewKey || today);
      y = num(base.y);
      m = num(base.m);
    }
    y = Math.min(Math.max(y, minYear), maxYear);
    setCursor({ y, m });
    setView("days");
    setOpen(true);
  }

  // بستن با کلیک بیرون و Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  // توی نمای سال‌ها، سال جاری رو بیار وسط لیست
  useEffect(() => {
    if (open && view === "years") {
      yearsRef.current?.querySelector("[data-current='true']")?.scrollIntoView({ block: "center" });
    }
  }, [open, view]);

  const cells = useMemo(() => {
    const len = jalaliMonthLength(cursor.y, cursor.m);
    const lead = firstWeekdayIndex(cursor.y, cursor.m);
    return [...Array(lead).fill(null), ...Array.from({ length: len }, (_, i) => i + 1)];
  }, [cursor.y, cursor.m]);

  const years = useMemo(() => {
    const list = [];
    for (let y = maxYear; y >= minYear; y--) list.push(y);
    return list;
  }, [minYear, maxYear]);

  function shiftMonth(delta) {
    setCursor(({ y, m }) => {
      let nm = m + delta;
      let ny = y;
      if (nm < 1) { nm = 12; ny -= 1; }
      if (nm > 12) { nm = 1; ny += 1; }
      return { y: ny, m: nm };
    });
  }

  const canPrevMonth = cursor.y > minYear || cursor.m > 1;
  const canNextMonth = cursor.y < maxYear || cursor.m < 12;

  function pick(day) {
    const key = keyOf(cursor.y, cursor.m, day);
    if (!key || outOfRange(key)) return;
    onChange(key);
    setOpen(false);
  }

  function pickToday() {
    if (outOfRange(today)) return;
    onChange(today);
    setOpen(false);
  }

  const navBtn =
    "flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-green-50 hover:text-green-700 disabled:pointer-events-none disabled:opacity-30";

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        id={id}
        onClick={() => (open ? setOpen(false) : openPicker())}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label ? `${label}${value ? ` — ${formatJalaliKey(value)}` : ""}` : undefined}
        className={cn(
          inputCls(Boolean(error)),
          "flex cursor-pointer items-center justify-between gap-2 text-start",
          compact && "h-10 rounded-lg px-3 text-xs",
          open && "border-green-600 ring-4 ring-green-600/15",
        )}
      >
        <span className={cn("truncate", value ? "font-medium text-slate-800" : "text-slate-400")}>
          {value ? formatJalaliKey(value) : placeholder}
        </span>
        <FaCalendarAlt size={compact ? 12 : 14} aria-hidden="true" className={cn("shrink-0", value ? "text-green-600" : "text-slate-400")} />
      </button>

      {open && (
        <>
          {/* پس‌زمینه‌ی کشوی موبایل */}
          <div aria-hidden="true" className="fixed inset-0 z-[59] bg-slate-900/40 backdrop-blur-[2px] sm:hidden" onClick={() => setOpen(false)} />

          <div
            role="dialog"
            aria-label="انتخاب تاریخ"
            dir="rtl"
            className={cn(
              "z-[60] overflow-hidden border border-slate-200 bg-white p-3 text-slate-800 shadow-pop",
              // موبایل: کشو از پایین؛ دسکتاپ: زیر فیلد
              "fixed inset-x-3 bottom-3 rounded-3xl animate-in fade-in-0 slide-in-from-bottom-4",
              "sm:absolute sm:inset-x-auto sm:bottom-auto sm:start-0 sm:top-full sm:mt-2 sm:w-[19.5rem] sm:rounded-2xl sm:slide-in-from-bottom-0 sm:zoom-in-95",
            )}
          >
            {/* سرتیتر */}
            <div className="mb-2 flex items-center justify-between gap-1">
              {view === "days" ? (
                <button type="button" onClick={() => shiftMonth(-1)} disabled={!canPrevMonth} aria-label="ماه قبل" className={navBtn}>
                  <FaChevronRight size={12} />
                </button>
              ) : view === "months" ? (
                <button type="button" onClick={() => setCursor((c) => ({ ...c, y: c.y - 1 }))} disabled={cursor.y <= minYear} aria-label="سال قبل" className={navBtn}>
                  <FaChevronRight size={12} />
                </button>
              ) : (
                <span className="h-9 w-9" />
              )}

              <div className="flex items-center gap-1 text-sm font-extrabold">
                {view === "days" && (
                  <button type="button" onClick={() => setView("months")} className="rounded-lg px-2 py-1 transition hover:bg-green-50 hover:text-green-700">
                    {JALALI_MONTHS[cursor.m - 1]}
                  </button>
                )}
                {view !== "years" ? (
                  <button type="button" onClick={() => setView("years")} className="rounded-lg px-2 py-1 transition hover:bg-green-50 hover:text-green-700">
                    {toFaDigits(cursor.y)}
                  </button>
                ) : (
                  <span className="px-2 py-1">انتخاب سال</span>
                )}
              </div>

              {view === "days" ? (
                <button type="button" onClick={() => shiftMonth(1)} disabled={!canNextMonth} aria-label="ماه بعد" className={navBtn}>
                  <FaChevronLeft size={12} />
                </button>
              ) : view === "months" ? (
                <button type="button" onClick={() => setCursor((c) => ({ ...c, y: c.y + 1 }))} disabled={cursor.y >= maxYear} aria-label="سال بعد" className={navBtn}>
                  <FaChevronLeft size={12} />
                </button>
              ) : (
                <span className="h-9 w-9" />
              )}
            </div>

            {/* روزها */}
            {view === "days" && (
              <div>
                <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-medium text-slate-400">
                  {WEEKDAYS.map((w, i) => (
                    <span key={w} title={WEEKDAY_NAMES[i]} className={cn("py-1", i === 6 && "text-red-400")}>
                      {w}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-y-0.5 text-center">
                  {cells.map((d, i) => {
                    if (d === null) return <span key={`e${i}`} />;
                    const k = keyOf(cursor.y, cursor.m, d);
                    const isSel = cursor.y === selY && cursor.m === selM && d === selD;
                    const isToday = k === today;
                    const disabled = outOfRange(k);
                    const isFriday = (i % 7) === 6;
                    return (
                      <button
                        key={d}
                        type="button"
                        disabled={disabled}
                        onClick={() => pick(d)}
                        aria-pressed={isSel}
                        aria-label={formatJalaliKey(k)}
                        className={cn(
                          "mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm transition",
                          isSel
                            ? "bg-green-700 font-bold text-white shadow-sm"
                            : isToday
                              ? "font-bold text-green-700 ring-1 ring-green-500/50 hover:bg-green-50"
                              : cn("hover:bg-green-50 hover:text-green-800", isFriday && "text-red-500"),
                          disabled && "pointer-events-none opacity-30",
                        )}
                      >
                        {toFaDigits(d)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ماه‌ها */}
            {view === "months" && (
              <div className="grid grid-cols-3 gap-1.5 py-1">
                {JALALI_MONTHS.map((name, i) => {
                  const m = i + 1;
                  const lastKey = keyOf(cursor.y, m, jalaliMonthLength(cursor.y, m));
                  const firstKey = keyOf(cursor.y, m, 1);
                  const disabled = Boolean((minKey && lastKey < minKey) || (maxKey && firstKey > maxKey));
                  const isSel = cursor.y === selY && m === selM;
                  const isNow = cursor.y === num(t.y) && m === num(t.m);
                  return (
                    <button
                      key={name}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        setCursor((c) => ({ ...c, m }));
                        setView("days");
                      }}
                      className={cn(
                        "h-11 rounded-xl text-sm transition",
                        isSel ? "bg-green-700 font-bold text-white" : isNow ? "font-bold text-green-700 ring-1 ring-green-500/50 hover:bg-green-50" : "hover:bg-green-50 hover:text-green-800",
                        disabled && "pointer-events-none opacity-30",
                      )}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            )}

            {/* سال‌ها */}
            {view === "years" && (
              <div ref={yearsRef} className="grid max-h-64 grid-cols-4 gap-1.5 overflow-y-auto py-1 pe-1">
                {years.map((y) => {
                  const isCurrent = y === cursor.y;
                  return (
                    <button
                      key={y}
                      type="button"
                      data-current={isCurrent}
                      onClick={() => {
                        setCursor((c) => ({ ...c, y }));
                        setView("months");
                      }}
                      className={cn(
                        "h-10 rounded-xl text-sm transition",
                        isCurrent ? "bg-green-700 font-bold text-white" : y === num(t.y) ? "font-bold text-green-700 ring-1 ring-green-500/50 hover:bg-green-50" : "hover:bg-green-50 hover:text-green-800",
                      )}
                    >
                      {toFaDigits(y)}
                    </button>
                  );
                })}
              </div>
            )}

            {/* پایین */}
            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
              <button
                type="button"
                onClick={pickToday}
                disabled={outOfRange(today)}
                className="rounded-full px-3 py-1.5 text-xs font-bold text-green-700 transition hover:bg-green-50 disabled:pointer-events-none disabled:opacity-30"
              >
                امروز
              </button>
              {allowClear && value ? (
                <button
                  type="button"
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                  className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                >
                  <FaTimes size={10} /> پاک‌کردن
                </button>
              ) : (
                <button type="button" onClick={() => setOpen(false)} className="rounded-full px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 sm:hidden">
                  بستن
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
