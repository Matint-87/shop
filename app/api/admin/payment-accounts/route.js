import { handler, ok, readJson } from "@/lib/api";
import { logActivity } from "@/lib/activity-log";
import { PAYMENT_ACCOUNT_KIND_META } from "@/lib/admin-constants";
import { fetchPaymentAccounts, toAdminPaymentAccount } from "@/lib/admin-queries";
import { requireApiAdmin } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { paymentAccountSchema } from "@/lib/schemas";

/** فقط ادمین: همه‌ی صندوق‌ها، بانک‌ها و کارت‌خوان‌ها (+ جمع دریافتی هرکدوم) */
export const GET = handler(async () => {
  await requireApiAdmin();
  return ok({ accounts: await fetchPaymentAccounts({ withStats: true }) });
});

/** تعریف یک صندوق / بانک / کارت‌خوان جدید */
export const POST = handler(async (request) => {
  const admin = await requireApiAdmin();
  const data = paymentAccountSchema.parse(await readJson(request));
  const created = await prisma.paymentAccount.create({ data });
  await logActivity(admin, {
    action: "CREATE",
    entity: "PAYMENT_ACCOUNT",
    entityId: created.id,
    summary: `${PAYMENT_ACCOUNT_KIND_META[created.kind].label} «${created.name}» تعریف شد`,
  });
  return ok({ account: toAdminPaymentAccount(created) }, { status: 201 });
});
