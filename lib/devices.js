// مدیریت «دستگاه‌های وارد‌شده» (نشست‌های کاربر): تشخیص مرورگر/سیستم‌عامل از User-Agent و عملیات دیتابیسی روی UserSession.
import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { getClientIp } from "@/lib/api";
import { SESSION_MAX_AGE } from "@/lib/auth-constants";

/** هر چند دقیقه یک‌بار «آخرین فعالیت» دستگاه به‌روز می‌شه (برای اینکه با هر درخواست روی دیتابیس ننویسیم) */
export const TOUCH_INTERVAL_MS = 10 * 60 * 1000;

/** User-Agent رو به برچسب‌های خوانا تبدیل می‌کنه. دقت ۱۰۰٪ مهم نیست؛ فقط باید کاربر دستگاهش رو تشخیص بده. */
export function parseUserAgent(ua = "") {
  const s = String(ua);

  let os = "سیستم‌عامل نامشخص";
  if (/iPhone|iPod/i.test(s)) os = "iOS";
  else if (/iPad/i.test(s)) os = "iPadOS";
  else if (/Android/i.test(s)) os = "Android";
  else if (/Windows NT/i.test(s)) os = "Windows";
  else if (/CrOS/i.test(s)) os = "ChromeOS";
  else if (/Mac OS X|Macintosh/i.test(s)) os = "macOS";
  else if (/Linux|X11/i.test(s)) os = "Linux";

  let browser = "مرورگر نامشخص";
  if (/Edg(e|A|iOS)?\//i.test(s)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(s)) browser = "Opera";
  else if (/SamsungBrowser/i.test(s)) browser = "Samsung Internet";
  else if (/Firefox\/|FxiOS/i.test(s)) browser = "Firefox";
  else if (/YaBrowser/i.test(s)) browser = "Yandex";
  else if (/Chrome\/|CriOS/i.test(s)) browser = "Chrome";
  else if (/Safari\//i.test(s)) browser = "Safari";

  let deviceType = "desktop";
  if (/iPad|Tablet/i.test(s) || (/Android/i.test(s) && !/Mobile/i.test(s))) deviceType = "tablet";
  else if (/Mobi|iPhone|iPod|Android/i.test(s)) deviceType = "mobile";

  return { browser, os, deviceType };
}

/** مشخصات دستگاهِ درخواست جاری (از هدرها) */
export async function describeRequestDevice() {
  const h = await headers();
  const userAgent = (h.get("user-agent") || "").slice(0, 400);
  return { userAgent: userAgent || null, ip: await getClientIp(), ...parseUserAgent(userAgent) };
}

/** نشست‌هایی که بیشتر از عمر توکن بی‌فعالیت بودن دیگه هیچ‌وقت برنمی‌گردن؛ از لیست پاک می‌شن */
export async function pruneStaleSessions(userId) {
  const cutoff = new Date(Date.now() - (SESSION_MAX_AGE + 24 * 60 * 60) * 1000);
  await prisma.userSession.deleteMany({ where: { userId, lastSeenAt: { lt: cutoff } } });
}

/** نمای امن برای مرورگر (userAgent خام و ... نمی‌ره) */
export function toPublicDevice(row, currentId) {
  return {
    id: row.id,
    browser: row.browser ?? "مرورگر نامشخص",
    os: row.os ?? "سیستم‌عامل نامشخص",
    deviceType: row.deviceType,
    ip: row.ip ?? null,
    isOrigin: row.isOrigin,
    isCurrent: row.id === currentId,
    createdAt: row.createdAt.toISOString(),
    lastSeenAt: row.lastSeenAt.toISOString(),
  };
}

/**
 * چه کسی اجازه‌ی بستن نشست‌های دیگه رو داره؟
 *  - دستگاهِ اصلی (جایی که حساب ساخته شد) همیشه.
 *  - اگه حساب اصلاً دستگاه اصلی نداشته باشه (حساب‌های قدیمی قبل از این قابلیت، یا وقتی دستگاه اصلی خارج شده)
 *    هر دستگاهِ واردشده؛ و دستگاهی که اون کار رو انجام بده دستگاه اصلی می‌شه.
 */
export async function getManageAccess(user) {
  const originCount = await prisma.userSession.count({ where: { userId: user.id, isOrigin: true } });
  return { hasOrigin: originCount > 0, canManage: Boolean(user.currentSessionIsOrigin) || originCount === 0 };
}

export const MANAGE_DENIED_MESSAGE =
  "فقط دستگاهی که حساب کاربری را روی آن ساخته‌اید می‌تواند دستگاه‌های دیگر را ببندد. اگر به آن دسترسی ندارید، از «فراموشی رمز عبور» استفاده کنید";
