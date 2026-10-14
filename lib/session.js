import "server-only";
import { cookies } from "next/headers";
import { isProd } from "@/lib/config";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  TICKET_COOKIE,
  TICKET_COOKIE_PATH,
  TICKET_MAX_AGE,
} from "@/lib/auth-constants";
import { prisma } from "@/lib/db";
import { describeRequestDevice } from "@/lib/devices";
import { signSessionToken, signTicket, verifySessionToken, verifyTicket } from "@/lib/token";

function baseOptions(path = "/") {
  return {
    httpOnly: true, // جاوااسکریپت صفحه به توکن دسترسی نداره (دفاع در برابر XSS)
    secure: isProd, // در production فقط روی HTTPS ارسال می‌شه
    sameSite: "lax", // دفاع در برابر CSRF
    path,
  };
}

/**
 * JWT می‌سازه و توی کوکی می‌ذاره. دو حالت داره:
 *  - newDevice: true  → «ورود جدید» (لاگین / ثبت‌نام / تعیین رمز): یک ردیف دستگاه ساخته می‌شه (یا اگه همین مرورگر قبلاً
 *    برای همین کاربر ردیف داشت، همون به‌روز می‌شه تا یک مرورگر چندبار توی لیست نیاد). isOrigin: دستگاهِ اصلی حساب.
 *  - newDevice: false → فقط رفرش claimها (مثلاً بعد از ذخیره‌ی پروفایل): دستگاه فعلی همون می‌مونه.
 * profileCompleted رو صریح پاس بده (حاصل lib/dal.js#isOnboarded)؛ اگه ندی، فقط از روی profileCompletedAt
 * خودِ کاربر حدس زده می‌شه که آدرس رو در نظر نمی‌گیره.
 */
export async function createSession(user, { profileCompleted, newDevice = false, isOrigin = false } = {}) {
  const oldToken = await readSessionCookie();
  const old = oldToken ? await verifySessionToken(oldToken) : null;
  let sessionId = old?.sid && old.sub === user.id ? old.sid : null;

  if (newDevice) {
    const info = await describeRequestDevice();
    const data = {
      userAgent: info.userAgent,
      browser: info.browser,
      os: info.os,
      deviceType: info.deviceType,
      ip: info.ip,
      lastSeenAt: new Date(),
    };
    // کاربر دیگه‌ای قبلاً توی همین مرورگر بوده → ردیف اون دستگاه بسته می‌شه
    if (old?.sid && old.sub !== user.id) {
      await prisma.userSession.deleteMany({ where: { id: old.sid, userId: old.sub } });
    }
    const reuse = sessionId
      ? await prisma.userSession.findFirst({ where: { id: sessionId, userId: user.id }, select: { id: true, isOrigin: true } })
      : null;
    if (reuse) {
      await prisma.userSession.update({ where: { id: reuse.id }, data: { ...data, ...(isOrigin && { isOrigin: true }) } });
      sessionId = reuse.id;
    } else {
      const created = await prisma.userSession.create({ data: { ...data, userId: user.id, isOrigin } });
      sessionId = created.id;
    }
  }

  const token = await signSessionToken({
    userId: user.id,
    role: user.role,
    tokenVersion: user.tokenVersion,
    profileCompleted: profileCompleted ?? Boolean(user.profileCompletedAt),
    sessionId,
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, { ...baseOptions(), maxAge: SESSION_MAX_AGE });
  return sessionId;
}

/** خروج از این دستگاه: کوکی پاک می‌شه و ردیف دستگاه هم حذف می‌شه (اگه توکن قدیمی بدون sid بود فقط کوکی پاک می‌شه) */
export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (session?.sid) {
    try {
      await prisma.userSession.deleteMany({ where: { id: session.sid, userId: session.sub } });
    } catch {
      // حذف ردیف شکست خورد؛ مهم اینه که کوکی پاک بشه
    }
  }
  store.set(SESSION_COOKIE, "", { ...baseOptions(), maxAge: 0 });
}

export async function readSessionCookie() {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

/** بلیط بعد از تأیید OTP */
export async function setTicketCookie({ phone, purpose, tokenVersion }) {
  const token = await signTicket({ phone, purpose, tokenVersion });
  const store = await cookies();
  store.set(TICKET_COOKIE, token, {
    ...baseOptions(TICKET_COOKIE_PATH),
    maxAge: TICKET_MAX_AGE,
  });
}

export async function readTicket() {
  const store = await cookies();
  const token = store.get(TICKET_COOKIE)?.value;
  return token ? verifyTicket(token) : null;
}

export async function clearTicketCookie() {
  const store = await cookies();
  store.set(TICKET_COOKIE, "", { ...baseOptions(TICKET_COOKIE_PATH), maxAge: 0 });
}
