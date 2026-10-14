// زمان‌بندی تحویل/دریافت سفارش: مشتری موقع ثبت سفارش «تاریخ» و «بازه‌ی ساعت» دریافت مرسوله رو انتخاب می‌کنه.
// ساعت کاری فروشگاه: همه‌ی روزهای هفته از ۹ صبح تا ۶:۳۰ عصر.
// بدون import سمت‌سروری → هم سرور (اعتبارسنجی/قیمت‌گذاری) و هم کلاینت (نمایش) ازش استفاده می‌کنن.
import { formatJalaliDayKey, formatJalaliKey, isDayKey, shiftDayKey } from "./jalali";
import { toFaDigits } from "./phone";
import { deliveryMessage } from "./shipping";

// ───────────── تنظیمات (برای عوض‌کردن ساعت‌ها/بازه‌ها فقط همین‌جا رو ویرایش کن) ─────────────
export const STORE_OPEN_MINUTES = 9 * 60; // ۰۹:۰۰
export const STORE_CLOSE_MINUTES = 18 * 60 + 30; // ۱۸:۳۰
export const SLOT_MINUTES = 60; // طول هر بازه (دقیقه)؛ آخرین بازه تا ساعت بسته‌شدن فروشگاه کوتاه می‌شه (۱۸:۰۰ تا ۱۸:۳۰)
export const SLOT_DAYS_AHEAD = 7; // امروز + ۶ روز بعد
/** حداقل فاصله‌ی «الان» تا شروع بازه (دقیقه) برای هر روش؛ فقط روش‌های داخل این جدول زمان‌بندی دارن */
export const SLOT_LEAD_MINUTES = { COURIER: 120, PICKUP: 60 };
export const SLOT_METHODS = Object.keys(SLOT_LEAD_MINUTES);

// ایران ساعت تابستانی نداره → اختلاف ثابت ۳:۳۰ با UTC
const TEHRAN_OFFSET_MIN = 210;
const WEEKDAYS = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"]; // ایندکس = getUTCDay()

/** آیا این روش ارسال باید زمان تحویل داشته باشه؟ */
export const needsSlot = (method) => SLOT_METHODS.includes(method);

const pad = (n) => String(n).padStart(2, "0");
const hhmm = (min) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
function toMinutes(s) {
  const m = /^(\d{2}):(\d{2})$/.exec(s ?? "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** «الان» به وقت تهران: { key: "YYYY-MM-DD", minutes } */
function tehranParts(date) {
  const t = new Date(date.getTime() + TEHRAN_OFFSET_MIN * 60_000);
  return { key: t.toISOString().slice(0, 10), minutes: t.getUTCHours() * 60 + t.getUTCMinutes() };
}

/** کلید روزِ «امروز» به وقت تهران */
export const slotToday = (now = new Date()) => tehranParts(now).key;

/** لحظه‌ی (UTC) روزِ key در دقیقه‌ی minutes به وقت تهران */
function instant(key, minutes) {
  return new Date(Date.parse(`${key}T00:00:00Z`) + (minutes - TEHRAN_OFFSET_MIN) * 60_000);
}

/** همه‌ی بازه‌های یک روز کاری: [{ start: "09:00", end: "10:00" }, ...] */
export function daySlots() {
  const out = [];
  for (let s = STORE_OPEN_MINUTES; s < STORE_CLOSE_MINUTES; s += SLOT_MINUTES) {
    out.push({ start: hhmm(s), end: hhmm(Math.min(s + SLOT_MINUTES, STORE_CLOSE_MINUTES)) });
  }
  return out;
}

/** بازه‌های قابل انتخاب برای یک روش: [{ date: "YYYY-MM-DD", slots: [{start,end}] }] (روزهای بدون بازه حذف می‌شن) */
export function availableSlots(method, now = new Date()) {
  const lead = SLOT_LEAD_MINUTES[method];
  if (lead == null) return [];
  const earliest = now.getTime() + lead * 60_000;
  const today = slotToday(now);
  const all = daySlots();
  const days = [];
  for (let i = 0; i < SLOT_DAYS_AHEAD; i++) {
    const date = shiftDayKey(today, i);
    const slots = all.filter((s) => instant(date, toMinutes(s.start)).getTime() >= earliest);
    if (slots.length) days.push({ date, slots });
  }
  return days;
}

/**
 * اعتبارسنجی انتخاب مشتری (سمت سرور).
 * @returns {{startAt: Date, endAt: Date} | null} null = نامعتبر یا دیگه در دسترس نیست
 */
export function resolveSlot(method, date, start, now = new Date()) {
  if (!isDayKey(date) || typeof start !== "string") return null;
  const slot = availableSlots(method, now)
    .find((d) => d.date === date)
    ?.slots.find((s) => s.start === start);
  if (!slot) return null;
  return { startAt: instant(date, toMinutes(slot.start)), endAt: instant(date, toMinutes(slot.end)) };
}

// ───────────── نمایش ─────────────

export function weekdayOf(key) {
  return WEEKDAYS[new Date(`${key}T00:00:00Z`).getUTCDay()] ?? "";
}

/** برچسب روز برای دکمه‌ها: { rel: "امروز" | "فردا" | «چهارشنبه»، date: «۱۹ مهر» } */
export function slotDayLabel(date, today) {
  const rel = date === today ? "امروز" : date === shiftDayKey(today, 1) ? "فردا" : weekdayOf(date);
  return { rel, date: formatJalaliDayKey(date) };
}

/** «۰۹:۰۰ تا ۱۰:۰۰» */
export const slotTimeLabel = (start, end) => toFaDigits(`${start} تا ${end}`);

/** برچسب انتخاب مشتری قبل از ثبت سفارش: «یکشنبه ۱۹ مهر ۱۴۰۵ — ساعت ۱۰:۰۰ تا ۱۱:۰۰» */
export const slotChoiceLabel = (date, slot) =>
  `${weekdayOf(date)} ${formatJalaliKey(date)} — ساعت ${slotTimeLabel(slot.start, slot.end)}`;

/** از ISO شروع/پایانِ ذخیره‌شده‌ی سفارش → «چهارشنبه ۱۹ مهر ۱۴۰۵ — ساعت ۱۱:۰۰ تا ۱۲:۰۰» (به وقت تهران) */
export function formatSlot(startAt, endAt) {
  if (!startAt || !endAt) return "";
  const s = new Date(startAt);
  const e = new Date(endAt);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return "";
  const sp = tehranParts(s);
  const ep = tehranParts(e);
  return `${weekdayOf(sp.key)} ${formatJalaliKey(sp.key)} — ساعت ${toFaDigits(hhmm(sp.minutes))} تا ${toFaDigits(hhmm(ep.minutes))}`;
}

/** عنوان فیلد: پیک «زمان تحویل»، حضوری «زمان مراجعه به فروشگاه» */
export const slotFieldLabel = (method) => (method === "PICKUP" ? "زمان مراجعه به فروشگاه" : "زمان تحویل");

/**
 * متن زمان تحویل یک سفارش: اگه مشتری زمان انتخاب کرده همون (تاریخ + ساعت)،
 * وگرنه (سفارش‌های قدیمی / روش‌های بدون زمان‌بندی مثل پست) همون deliveryMessage قبلی.
 */
export function deliverySummary(order, city) {
  if (order.deliverySlotStart && order.deliverySlotEnd) {
    return `${slotFieldLabel(order.shippingMethod)}: ${formatSlot(order.deliverySlotStart, order.deliverySlotEnd)}`;
  }
  return deliveryMessage(order.shippingMethod, city, order.deliveryTime);
}
