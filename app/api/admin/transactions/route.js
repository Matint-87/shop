import { ApiError, handler, ok, readJson } from "@/lib/api";
import { logActivity } from "@/lib/activity-log";
import { METHOD_ACCOUNT_KIND, PAYMENT_ACCOUNT_KIND_META } from "@/lib/admin-constants";
import { fetchTransactionsPage, parseCursor, parseTransactionFilters, toAdminTransaction } from "@/lib/admin-queries";
import { requireApiAdmin } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { assertTransactionFits, lockOrder, orderMoney } from "@/lib/finance";
import { formatToman } from "@/lib/format";
import { transactionCreateSchema } from "@/lib/schemas";
import { creditWallet } from "@/lib/wallet";

/** فقط ادمین: لیست تراکنش‌ها، ۱۰تا۱۰تا + فیلترهای q, type, status, method */
export const GET = handler(async (request) => {
  await requireApiAdmin();
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const { items, nextCursor, total } = await fetchTransactionsPage(parseTransactionFilters(sp), parseCursor(sp.cursor));
  return ok({ transactions: items, nextCursor, total });
});

/**
 * ثبت دستی پرداخت یا برگشت وجه برای یک سفارش.
 * پرداخت پیش‌فرض «موفق» و برگشت وجه پیش‌فرض «در انتظار» ثبت می‌شه (به‌جز برگشت به «کیف پول» که فوراً «موفق» می‌شه).
 * برگشت وجهِ «موفق» با روش «کیف پول» مبلغ رو همون لحظه به کیف پول کاربر اضافه می‌کنه.
 * پرداخت با روش «کیف پول» فقط از سمت خود کاربر (هنگام پرداخت سفارش) انجام می‌شه، نه دستی.
 *
 * دریافت وجه بعد از تحویل: برای روش‌های «نقدی»، «کارت به کارت» و «کارت‌خوان» انتخاب محل دریافت (accountId) اجباریه:
 * نقدی ← صندوق، کارت به کارت ← بانک، کارت‌خوان ← کارت‌خوان. نام حساب هم توی تراکنش اسنپ‌شات می‌شه.
 */
export const POST = handler(async (request) => {
  const admin = await requireApiAdmin();
  const data = transactionCreateSchema.parse(await readJson(request));

  const order = await prisma.order.findUnique({ where: { code: data.orderCode } });
  if (!order) throw new ApiError(404, "سفارشی با این کد پیدا نشد", { fields: { orderCode: "سفارش پیدا نشد" } });

  if (data.type === "PAYMENT" && data.method === "WALLET") {
    throw new ApiError(400, "پرداخت با کیف پول فقط توسط خود کاربر انجام می‌شود", {
      fields: { method: "برای پرداخت دستی روش دیگری انتخاب کنید" },
    });
  }
  const status = data.status ?? (data.type === "REFUND" && data.method !== "WALLET" ? "PENDING" : "SUCCESS");

  // ───── محل دریافت وجه (صندوق / بانک / کارت‌خوان) ─────
  const wantedKind = METHOD_ACCOUNT_KIND[data.method]; // برای ONLINE و WALLET تعریف نشده
  let account = null;
  if (data.accountId) {
    if (!wantedKind) {
      throw new ApiError(400, "برای این روش، محل دریافت انتخاب نمی‌شود", { fields: { accountId: "برای این روش لازم نیست" } });
    }
    account = await prisma.paymentAccount.findUnique({ where: { id: data.accountId } });
    if (!account || !account.isActive) {
      throw new ApiError(400, "محل دریافت انتخاب‌شده معتبر یا فعال نیست", { fields: { accountId: "محل دریافت معتبر نیست" } });
    }
    if (account.kind !== wantedKind) {
      throw new ApiError(400, `برای این روش باید «${PAYMENT_ACCOUNT_KIND_META[wantedKind].label}» انتخاب شود`, {
        fields: { accountId: `باید ${PAYMENT_ACCOUNT_KIND_META[wantedKind].label} انتخاب شود` },
      });
    }
  } else if (data.type === "PAYMENT" && wantedKind && status !== "FAILED") {
    throw new ApiError(400, `${PAYMENT_ACCOUNT_KIND_META[wantedKind].label} را انتخاب کنید`, {
      fields: { accountId: `${PAYMENT_ACCOUNT_KIND_META[wantedKind].label} را انتخاب کنید` },
    });
  }

  const created = await prisma.$transaction(async (tx) => {
    await lockOrder(tx, order.id);
    const current = await tx.order.findUnique({ where: { id: order.id } });
    if (data.type === "PAYMENT" && status !== "FAILED" && ["CANCELED", "RETURNED"].includes(current.status)) {
      throw new ApiError(400, "این سفارش لغو شده و پرداخت جدیدی نمی‌پذیرد");
    }
    if (status !== "FAILED") {
      assertTransactionFits(data, await orderMoney(tx, order.id), order.payable);
    }
    const row = await tx.transaction.create({
      data: {
        type: data.type,
        status,
        method: data.method,
        amount: data.amount,
        orderId: order.id,
        userId: order.userId,
        reference: data.reference,
        note: data.note,
        accountId: account?.id ?? null,
        accountName: account?.name ?? null,
      },
      include: { order: true, user: true },
    });
    if (data.type === "REFUND" && data.method === "WALLET" && status === "SUCCESS") {
      await creditWallet(tx, {
        userId: order.userId,
        amount: data.amount,
        reason: "ORDER_REFUND",
        orderCode: order.code,
        note: data.note || `برگشت وجه سفارش ${order.code}`,
        adminName: [admin.firstName, admin.lastName].filter(Boolean).join(" ") || admin.phone,
      });
    }
    return row;
  });

  await logActivity(admin, {
    action: "CREATE",
    entity: "TRANSACTION",
    entityId: created.id,
    summary: `${data.type === "REFUND" ? "برگشت وجه" : "پرداخت"} ${formatToman(data.amount)} برای سفارش ${order.code} ثبت شد${account ? ` (${account.name})` : ""}${data.type === "REFUND" && data.method === "WALLET" && status === "SUCCESS" ? " و به کیف پول کاربر واریز شد" : ""}`,
  });
  return ok({ transaction: toAdminTransaction(created) }, { status: 201 });
});
