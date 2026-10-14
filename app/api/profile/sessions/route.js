import { handler, ok } from "@/lib/api";
import { isOnboarded, requireApiUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { pruneStaleSessions, toPublicDevice } from "@/lib/devices";
import { createSession } from "@/lib/session";

/**
 * لیست دستگاه‌های وارد‌شده‌ی کاربر.
 * کاربرانی که قبل از اضافه‌شدن این قابلیت وارد شده‌ان توکنشون sid نداره؛ اولین باری که این لیست رو باز کنن
 * برای همین دستگاه یک ردیف ساخته می‌شه (و کوکی تازه می‌گیره) تا خودشون توی لیست دیده بشن.
 */
export const GET = handler(async () => {
  const user = await requireApiUser();
  let currentId = user.currentSessionId;
  if (!currentId) {
    currentId = await createSession(user, { profileCompleted: await isOnboarded(user), newDevice: true });
  }
  await pruneStaleSessions(user.id);

  const rows = await prisma.userSession.findMany({
    where: { userId: user.id },
    orderBy: [{ lastSeenAt: "desc" }],
  });
  const originCount = rows.filter((r) => r.isOrigin).length;
  const currentRow = rows.find((r) => r.id === currentId);
  const canManage = Boolean(currentRow?.isOrigin) || originCount === 0;

  // دستگاه فعلی اول، بعد دستگاه اصلی، بعد بقیه بر اساس آخرین فعالیت
  const devices = rows
    .map((r) => toPublicDevice(r, currentId))
    .sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent) || Number(b.isOrigin) - Number(a.isOrigin));

  return ok({ devices, canManage, hasOrigin: originCount > 0 });
});

