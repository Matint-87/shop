import { z } from "zod";
import { ApiError, handler, ok, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { pushEnabled, vapidPublicKey } from "@/lib/push";

/**
 * آدرس endpoint رو خودِ کاربر می‌فرسته و سرور بعداً بهش POST می‌زنه؛ پس باید جلوی SSRF گرفته بشه:
 * فقط https و فقط نام‌دامنه‌ی عمومی (نه IP، localhost یا آدرس‌های داخلی). سرویس‌های واقعی پوش (FCM، Mozilla، Apple، Windows) همه همین‌ان.
 */
function isSafePushEndpoint(value) {
  try {
    const u = new URL(value);
    if (u.protocol !== "https:" || u.username || u.password) return false;
    if (u.port && u.port !== "443") return false;
    const host = u.hostname.toLowerCase();
    if (!host.includes(".") || /^[\d.]+$/.test(host) || host.includes(":") || host.startsWith("[")) return false; // IP
    if (/(^|\.)(localhost|local|internal|intranet|lan|home|corp)$/.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}
const safeEndpoint = z.string().max(1000).refine(isSafePushEndpoint, "آدرس اشتراک پوش معتبر نیست");

const subscribeSchema = z.object({
  endpoint: safeEndpoint,
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});
const unsubscribeSchema = z.object({ endpoint: z.string().url().max(1000) }); // حذف فقط ردیف خودِ کاربر رو پاک می‌کنه؛ نیازی به قفل SSRF نیست

/** کلید عمومی VAPID برای subscribe کردن مرورگر (اگه پوش روی سرور تنظیم نشده enabled=false) */
export const GET = handler(async () => {
  await requireApiUser();
  return ok({ enabled: pushEnabled(), publicKey: vapidPublicKey() });
});

/** ثبت (یا انتقال به کاربر جاری) اشتراک پوش این دستگاه */
export const POST = handler(async (request) => {
  const user = await requireApiUser();
  if (!pushEnabled()) throw new ApiError(503, "اعلان پوش روی سرور فعال نشده است");
  const { endpoint, keys } = subscribeSchema.parse(await readJson(request));
  const userAgent = (request.headers.get("user-agent") || "").slice(0, 300) || null;
  // اگه همین دستگاه قبلاً با حساب دیگری ثبت شده بود، به کاربر فعلی منتقل می‌شه
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent },
    update: { userId: user.id, p256dh: keys.p256dh, auth: keys.auth, userAgent },
  });
  return ok({});
});

/** حذف اشتراک این دستگاه (موقع خروج از حساب یا خاموش‌کردن اعلان) */
export const DELETE = handler(async (request) => {
  const user = await requireApiUser();
  const { endpoint } = unsubscribeSchema.parse(await readJson(request));
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
  return ok({});
});
