// بدنه‌ی فاکتور (سرور کامپوننت) — هم برای مشتری، هم چاپ ادمین (تکی و گروهی) استفاده می‌شه.
import { PAYMENT_STATUS_META } from "@/lib/order-constants";
import { formatNumber, formatToman } from "@/lib/format";
import { formatJalaliDateTime } from "@/lib/jalali";
import { toFaDigits } from "@/lib/phone";
import { formatSlot, slotFieldLabel } from "@/lib/delivery-slots";
import { SHIPPING_LABELS, deliveryMessage, shippingFeeLabel } from "@/lib/shipping";
import { STORE_INFO, STORE_PHONE_FA } from "@/lib/store-info";

const STATUS_LABELS = {
  PENDING: "در انتظار بررسی",
  PROCESSING: "در حال آماده‌سازی",
  SHIPPING: "در حال ارسال",
  DELIVERED: "تحویل شده",
  RETURNED: "مرجوع شده",
  CANCELED: "لغو شده",
};

function InfoLine({ label, children }) {
  return (
    <p className="leading-5 print:leading-[1.35]">
      <span className="text-slate-500">{label}: </span>
      <span className="font-medium text-slate-900">{children}</span>
    </p>
  );
}

const th = "border border-slate-400 px-1 py-1 text-center font-bold print:px-0.5 print:py-0.5";
const td = "border border-slate-400 px-1 py-1.5 text-center print:px-0.5 print:py-0.5";

/**
 * order: خروجی toPublicOrder — buyer: { name, phone, nationalCode? } — payment: خروجی publicPayment
 * breakAfter: بعد از این فاکتور صفحه‌ی جدید شروع بشه (برای چاپ گروهی)
 * طرح: شبیه فاکتور کاغذی فروشگاه (بدون کد کالا)، با بخش‌های فشرده تا کل فاکتور تو یک صفحه‌ی A5 جا بشه.
 */
export default function InvoiceDocument({ order, buyer, payment, breakAfter = false }) {
  const a = order.address;
  const totalQty = order.items.reduce((n, it) => n + it.quantity, 0);
  const showPayment = order.status !== "CANCELED" && order.status !== "RETURNED";
  return (
    <article
      className={`mx-auto max-w-[148mm] ${breakAfter ? "print:break-after-page" : ""} break-inside-avoid rounded-2xl bg-white p-4 text-[11px] leading-5 shadow-sm ring-1 ring-slate-200 sm:p-5 print:max-w-none print:rounded-none print:p-0 print:text-[8.5px] print:leading-[1.35] print:shadow-none print:ring-0`}
    >
      {/* سربرگ */}
      <header className="flex items-start justify-between gap-3 border-b-2 border-slate-800 pb-2 print:pb-1">
        <div>
          <h1 className="text-base font-extrabold print:text-[13px]">فاکتور فروش</h1>
          <p className="text-xs font-bold text-green-800 print:text-[10px]">{STORE_INFO.name}</p>
        </div>
        <div className="space-y-0.5 text-[11px] print:text-[8.5px]">
          <InfoLine label="شماره">{toFaDigits(order.code)}</InfoLine>
          <InfoLine label="تاریخ">{formatJalaliDateTime(order.createdAt)}</InfoLine>
          <InfoLine label="وضعیت">
            {STATUS_LABELS[order.status]}
            {showPayment ? ` / ${PAYMENT_STATUS_META[payment.status].label}` : ""}
          </InfoLine>
        </div>
      </header>

      {/* فروشنده / خریدار / تحویل — فشرده در یک کادر */}
      <section className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 rounded-lg border border-slate-400 p-2 print:mt-1 print:gap-x-2 print:p-1">
        <div>
          <InfoLine label="فروشنده">{STORE_INFO.name}</InfoLine>
          {STORE_INFO.phone && <InfoLine label="تلفن">{STORE_PHONE_FA}</InfoLine>}
          {STORE_INFO.economicCode && <InfoLine label="کد اقتصادی">{toFaDigits(STORE_INFO.economicCode)}</InfoLine>}
        </div>
        <div>
          <InfoLine label="خریدار">{buyer.name}</InfoLine>
          <InfoLine label="موبایل">{toFaDigits(buyer.phone)}</InfoLine>
          {buyer.nationalCode && <InfoLine label="کد ملی">{toFaDigits(buyer.nationalCode)}</InfoLine>}
        </div>
        <div className="col-span-2 border-t border-dashed border-slate-300 pt-0.5">
          <InfoLine label="تحویل">
            {SHIPPING_LABELS[order.shippingMethod] ?? "—"}
            {" · "}
            {order.deliverySlotStart
              ? `${slotFieldLabel(order.shippingMethod)}: ${formatSlot(order.deliverySlotStart, order.deliverySlotEnd)}`
              : deliveryMessage(order.shippingMethod, a.city, order.deliveryTime)}
          </InfoLine>
          <InfoLine label="گیرنده">
            {a.recipientName} — {toFaDigits(a.recipientPhone)}
          </InfoLine>
          <InfoLine label="نشانی">
            {a.province}، {a.city}
            {a.neighborhood ? `، ${a.neighborhood}` : ""}، {a.addressLine}
            {a.plaque ? `، پلاک ${toFaDigits(a.plaque)}` : ""}
            {a.unit ? `، واحد ${toFaDigits(a.unit)}` : ""}
            {a.postalCode ? ` (کد پستی ${toFaDigits(a.postalCode)})` : ""}
          </InfoLine>
          {order.trackingCode && (
            <InfoLine label="کد رهگیری">
              <span dir="ltr">{order.trackingCode}</span>
            </InfoLine>
          )}
        </div>
      </section>

      {/* اقلام */}
      <section className="mt-2 overflow-x-auto print:mt-1 print:overflow-visible">
        <table className="w-full min-w-[480px] border-collapse text-[10px] print:min-w-0 print:text-[8px]">
          <thead>
            <tr className="bg-slate-100">
              <th className={th}>ردیف</th>
              <th className={`${th} w-[34%]`}>عنوان کالا</th>
              <th className={th}>واحد</th>
              <th className={th}>تعداد</th>
              <th className={th}>قیمت واحد</th>
              <th className={th}>قیمت کل</th>
              <th className={th}>تخفیف ٪</th>
              <th className={th}>مبلغ تخفیف</th>
              <th className={th}>مبلغ نهایی</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((it, i) => {
              const gross = it.unitPrice * it.quantity;
              const discount = (it.unitPrice - it.finalPrice) * it.quantity;
              const pct = gross > 0 ? Math.round((discount / gross) * 100) : 0;
              return (
                <tr key={it.id} className="break-inside-avoid">
                  <td className={td}>{formatNumber(i + 1)}</td>
                  <td className={`${td} !text-start`}>{it.name}</td>
                  <td className={td}>{it.unitLabel}</td>
                  <td className={td}>{formatNumber(it.quantity)}</td>
                  <td className={td}>{formatNumber(it.unitPrice)}</td>
                  <td className={td}>{formatNumber(gross)}</td>
                  <td className={td}>{formatNumber(pct)}</td>
                  <td className={td}>{formatNumber(discount)}</td>
                  <td className={`${td} font-bold`}>{formatNumber(it.finalPrice * it.quantity)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 font-bold">
              <td className={td} colSpan={3}>
                جمع
              </td>
              <td className={td}>{formatNumber(totalQty)}</td>
              <td className={td} />
              <td className={td}>{formatNumber(order.itemsTotal)}</td>
              <td className={td} />
              <td className={td}>{formatNumber(order.discountTotal)}</td>
              <td className={td}>{formatNumber(order.itemsTotal - order.discountTotal)}</td>
            </tr>
          </tfoot>
        </table>
        <p className="mt-0.5 text-[10px] text-slate-500 print:text-[7.5px]">همه‌ی مبالغ به تومان است.</p>
      </section>

      {/* جمع‌بندی */}
      <section className="mt-2 flex items-start justify-between gap-3 break-inside-avoid print:mt-1">
        <div className="min-w-0 flex-1 text-[10px] print:text-[8px]">
          {order.note && (
            <p className="leading-5">
              <span className="font-bold">توضیحات: </span>
              {order.note}
            </p>
          )}
        </div>
        <dl className="w-full max-w-[60mm] space-y-0.5 rounded-lg border border-slate-400 p-2 text-[11px] print:max-w-[56mm] print:p-1 print:text-[8.5px]">
          <div className="flex justify-between">
            <dt className="text-slate-600">جمع کل تخفیف‌ها</dt>
            <dd>{formatToman(order.discountTotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-600">جمع پس از کسر تخفیف</dt>
            <dd>{formatToman(order.itemsTotal - order.discountTotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-600">هزینه‌ی ارسال</dt>
            <dd>{shippingFeeLabel(order, formatToman)}</dd>
          </div>
          <div className="flex justify-between border-t border-slate-400 pt-0.5 text-xs font-extrabold print:text-[10px]">
            <dt>مبلغ قابل پرداخت</dt>
            <dd>{formatToman(order.payable)}</dd>
          </div>
        </dl>
      </section>

      <footer className="mt-2 border-t border-slate-300 pt-1 text-center text-[10px] text-slate-500 print:mt-1 print:text-[7.5px]">
        از خرید شما سپاسگزاریم — {STORE_INFO.name}
        {STORE_INFO.website ? ` — ${STORE_INFO.website.replace(/^https?:\/\//, "")}` : ""}
      </footer>
    </article>
  );
}
