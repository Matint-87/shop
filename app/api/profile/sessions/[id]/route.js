import { ApiError, handler, ok, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { MANAGE_DENIED_MESSAGE, getManageAccess } from "@/lib/devices";

/** بستن نشست یک دستگاه دیگه (همون دستگاه بلافاصله از حساب خارج می‌شه) — فقط دستگاه اصلی */
export const DELETE = handler(async (request, { params }) => {
  await readJson(request); // فقط JSON (دفاع در برابر CSRF)
  const user = await requireApiUser();
  const { id } = await params;

  if (id === user.currentSessionId) {
    throw new ApiError(400, "برای خروج از همین دستگاه از دکمه‌ی «خروج از حساب کاربری» استفاده کنید");
  }
  const { canManage } = await getManageAccess(user);
  if (!canManage) throw new ApiError(403, MANAGE_DENIED_MESSAGE);

  // شناسه‌ی غیر UUID به Prisma نرسه (خطای 500 نده)
  if (!/^[0-9a-f-]{36}$/i.test(String(id))) throw new ApiError(404, "این دستگاه پیدا نشد");
  const res = await prisma.userSession.deleteMany({ where: { id, userId: user.id } });
  if (res.count === 0) throw new ApiError(404, "این دستگاه قبلاً بسته شده است");
  return ok();
});
