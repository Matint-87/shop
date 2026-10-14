import { ApiError, handler, ok, readJson } from "@/lib/api";
import { isOnboarded, requireApiUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";
import { changePasswordSchema } from "@/lib/schemas";
import { createSession } from "@/lib/session";
import { checkPassword } from "@/lib/validators";

/**
 * تغییر رمز عبور توسط کاربر واردشده (رمز فعلی لازمه).
 * بعد از تغییر: tokenVersion زیاد می‌شه و همه‌ی دستگاه‌های دیگه از حساب خارج می‌شن؛ همین دستگاه با توکن تازه می‌مونه.
 */
export const POST = handler(async (request) => {
  const { currentPassword, newPassword } = changePasswordSchema.parse(await readJson(request));
  const user = await requireApiUser();

  await rateLimit(
    `chpw:user:${user.id}`,
    5,
    900,
    "تلاش‌های تغییر رمز زیاد بوده است. ۱۵ دقیقه دیگر دوباره امتحان کنید",
  );

  if (!user.passwordHash) {
    throw new ApiError(400, "برای این حساب هنوز رمز عبور تعیین نشده است. از «فراموشی رمز عبور» استفاده کنید");
  }
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new ApiError(400, "رمز عبور فعلی اشتباه است", { fields: { currentPassword: "رمز عبور فعلی اشتباه است" } });
  }
  const problem = checkPassword(newPassword, user.phone);
  if (problem) throw new ApiError(400, problem, { fields: { newPassword: problem } });
  if (await verifyPassword(newPassword, user.passwordHash)) {
    const msg = "رمز جدید باید با رمز فعلی فرق داشته باشد";
    throw new ApiError(400, msg, { fields: { newPassword: msg } });
  }

  const passwordHash = await hashPassword(newPassword);
  const updated = await prisma.$transaction(async (tx) => {
    await tx.userSession.deleteMany({
      where: { userId: user.id, ...(user.currentSessionId && { id: { not: user.currentSessionId } }) },
    });
    return tx.user.update({
      where: { id: user.id },
      data: { passwordHash, tokenVersion: { increment: 1 }, failedLoginCount: 0, lockedUntil: null },
    });
  });
  await createSession(updated, {
    profileCompleted: await isOnboarded(updated),
    newDevice: !user.currentSessionId,
  });
  return ok();
});
