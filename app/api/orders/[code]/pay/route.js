import { ApiError, handler, ok, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { lockOrder, moneyByOrder, orderMoney, publicPayment } from "@/lib/finance";
import { NOT_PAYABLE_STATUSES } from "@/lib/order-constants";
import { rateLimit } from "@/lib/rate-limit";
import { payOrderSchema } from "@/lib/schemas";
import { debitWallet } from "@/lib/wallet";

/**
 * پرداخت سفارش از «کیف پول» (بعد از ثبت سفارش). بدنه: { useWallet: true }
 *
 * پرداخت آنلاین (درگاه) حذف شده: مبلغ سفارش هنگام تحویل (حضوری یا درب منزل) دریافت می‌شه و مدیر بعد از تحویل
 * از پنل ثبت می‌کنه پول به کدوم صندوق / بانک / کارت‌خوان رسیده. مشتری فقط می‌تونه از اعتبار کیف پولش پیش‌پرداخت کنه:
 *  • موجودی کیف پول ≥ مانده → کل سفارش پرداخت می‌شه ({paid: true}).
 *  • موجودی کمتر → همون مقدار از کیف پول کم می‌شه و «باقی‌مانده» هنگام تحویل پرداخت می‌شه ({paid: false, remaining}).
 * کم‌کردن از کیف پول و ساخت تراکنش با هم و زیر قفل ردیف سفارش انجام می‌شن.
 */
export const POST = handler(async (request, { params }) => {
  const user = await requireApiUser();
  const { code } = await params;
  if (!/^\d{8}$/.test(code)) throw new ApiError(400, "کد سفارش نامعتبر است");
  await rateLimit(`pay:${user.id}`, 30, 60 * 60, "تعداد تلاش‌های پرداخت بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.");
  const { useWallet } = payOrderSchema.parse(await readJson(request));
  if (!useWallet) {
    throw new ApiError(400, "پرداخت آنلاین فعال نیست. مبلغ سفارش هنگام تحویل دریافت می‌شود یا می‌توانید از کیف پول پرداخت کنید.");
  }

  const order = await prisma.order.findFirst({ where: { code, userId: user.id } });
  if (!order) throw new ApiError(404, "سفارش پیدا نشد");
  if (NOT_PAYABLE_STATUSES.includes(order.status)) throw new ApiError(409, "این سفارش لغو شده و قابل پرداخت نیست");

  // ───── ۱) طرح پرداخت (بدون قفل؛ بعداً داخل تراکنش دوباره چک می‌شه) ─────
  const money = (await moneyByOrder(prisma, [order.id])).get(order.id);
  const { remaining } = publicPayment(order, money);
  if (remaining <= 0) {
    throw new ApiError(409, money.paidPending - money.gatewayPending > 0
      ? "پرداخت این سفارش در انتظار تأیید است"
      : "این سفارش قبلاً پرداخت شده است");
  }
  const fresh = await prisma.user.findUnique({ where: { id: user.id }, select: { walletBalance: true } });
  const walletPart = Math.min(fresh.walletBalance, remaining);
  if (walletPart === 0) throw new ApiError(409, "موجودی کیف پول شما صفر است");

  // ───── ۲) ثبت نهایی: داخل یک تراکنش و زیر قفل سفارش ─────
  await prisma.$transaction(
    async (tx) => {
      await lockOrder(tx, order.id);
      const current = await tx.order.findUnique({ where: { id: order.id } });
      if (NOT_PAYABLE_STATUSES.includes(current.status)) throw new ApiError(409, "این سفارش لغو شده و قابل پرداخت نیست");

      // تلاش‌های ناتمامِ قدیمیِ درگاه (از قبل از حذف درگاه) کنار گذاشته می‌شن
      await tx.transaction.updateMany({
        where: { orderId: order.id, type: "PAYMENT", status: "PENDING", authority: { not: null } },
        data: { status: "FAILED", note: "پرداخت ناتمام؛ با تلاش جدید جایگزین شد" },
      });
      const now = await orderMoney(tx, order.id);
      if (current.payable - now.paidActive !== remaining) {
        throw new ApiError(409, "وضعیت پرداخت این سفارش تغییر کرد. صفحه را تازه کنید و دوباره تلاش کنید.");
      }

      await debitWallet(tx, {
        userId: user.id,
        amount: walletPart,
        reason: "ORDER_PAYMENT",
        orderCode: code,
        note: `پرداخت سفارش ${code}`,
      });
      await tx.transaction.create({
        data: {
          type: "PAYMENT",
          status: "SUCCESS",
          method: "WALLET",
          amount: walletPart,
          orderId: order.id,
          userId: user.id,
          note: "پرداخت از کیف پول",
        },
      });
    },
    { timeout: 20_000 },
  );

  const after = await prisma.user.findUnique({ where: { id: user.id }, select: { walletBalance: true } });
  const left = remaining - walletPart;
  return ok({
    paid: left === 0,
    walletPaid: walletPart,
    remaining: left, // باقی‌مانده که هنگام تحویل دریافت می‌شه
    walletBalance: after?.walletBalance ?? 0,
  });
});
