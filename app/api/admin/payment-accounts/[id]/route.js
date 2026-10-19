import { ApiError, handler, ok, pickProvided, readJson } from "@/lib/api";
import { logActivity } from "@/lib/activity-log";
import { PAYMENT_ACCOUNT_KIND_META } from "@/lib/admin-constants";
import { toAdminPaymentAccount } from "@/lib/admin-queries";
import { requireApiAdmin } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { paymentAccountSchema, uuidSchema } from "@/lib/schemas";

async function readId(ctx) {
  const { id } = await ctx.params;
  if (!uuidSchema.safeParse(id).success) throw new ApiError(400, "شناسه نامعتبر است");
  return id;
}

/** ویرایش یا فعال/غیرفعال‌کردن. نوع (صندوق/بانک/کارت‌خوان) بعد از ثبت قابل تغییر نیست تا سابقه‌ی دریافت‌ها قاطی نشه. */
export const PATCH = handler(async (request, ctx) => {
  const admin = await requireApiAdmin();
  const id = await readId(ctx);
  const raw = await readJson(request);
  const data = pickProvided(raw, paymentAccountSchema.partial().parse(raw));
  delete data.kind;
  const updated = await prisma.paymentAccount.update({ where: { id }, data }).catch(() => {
    throw new ApiError(404, "پیدا نشد");
  });
  await logActivity(admin, {
    action: "UPDATE",
    entity: "PAYMENT_ACCOUNT",
    entityId: id,
    summary: `${PAYMENT_ACCOUNT_KIND_META[updated.kind].label} «${updated.name}» ویرایش شد`,
  });
  return ok({ account: toAdminPaymentAccount(updated) });
});

export const DELETE = handler(async (_request, ctx) => {
  const admin = await requireApiAdmin();
  const id = await readId(ctx);
  const existing = await prisma.paymentAccount.findUnique({ where: { id }, include: { _count: { select: { transactions: true } } } });
  if (!existing) throw new ApiError(404, "پیدا نشد");
  // سابقه‌ی دریافت‌ها حفظ بشه: حسابِ دارای تراکنش حذف نمی‌شه، فقط غیرفعال می‌شه
  if (existing._count.transactions > 0) {
    throw new ApiError(409, `روی این مورد ${existing._count.transactions} تراکنش ثبت شده و قابل حذف نیست. به‌جای حذف، آن را غیرفعال کنید.`);
  }
  await prisma.paymentAccount.delete({ where: { id } });
  await logActivity(admin, {
    action: "DELETE",
    entity: "PAYMENT_ACCOUNT",
    entityId: id,
    summary: `${PAYMENT_ACCOUNT_KIND_META[existing.kind].label} «${existing.name}» حذف شد`,
  });
  return ok({});
});
