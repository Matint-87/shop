import { ApiError, handler, ok, readJson } from "@/lib/api";
import { isOnboarded, requireApiUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { MANAGE_DENIED_MESSAGE, getManageAccess } from "@/lib/devices";
import { createSession } from "@/lib/session";

/**
 * خروج از همه‌ی دستگاه‌های دیگه (فقط دستگاه اصلی).
 * علاوه بر حذف ردیف‌ها، tokenVersion هم زیاد می‌شه تا توکن‌های قدیمی که هنوز sid ندارن هم باطل بشن؛
 * این دستگاه با توکن تازه وارد می‌مونه.
 */
export const POST = handler(async (request) => {
  await readJson(request);
  const user = await requireApiUser();
  const { hasOrigin, canManage } = await getManageAccess(user);
  if (!canManage) throw new ApiError(403, MANAGE_DENIED_MESSAGE);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.userSession.deleteMany({
      where: { userId: user.id, ...(user.currentSessionId && { id: { not: user.currentSessionId } }) },
    });
    return tx.user.update({ where: { id: user.id }, data: { tokenVersion: { increment: 1 } } });
  });
  // اگه حساب دستگاه اصلی نداشت، این دستگاه می‌شه دستگاه اصلی
  await createSession(updated, {
    profileCompleted: await isOnboarded(updated),
    newDevice: !user.currentSessionId || !hasOrigin,
    isOrigin: !hasOrigin,
  });
  return ok();
});
