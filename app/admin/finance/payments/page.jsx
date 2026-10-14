import TransactionsAdmin from "@/components/admin/TransactionsAdmin";
import { fetchTransactionsPage, parseTransactionFilters } from "@/lib/admin-queries";
import { paramString } from "@/lib/admin-dal";
import { toEnglishDigits } from "@/lib/phone";
import { requireAdmin } from "@/lib/dal";

export const metadata = { title: "پرداخت‌ها | پنل مدیریت" };

export default async function AdminPaymentsPage({ searchParams }) {
  await requireAdmin(); // دفاع در عمق: layout موقع ناوبری سمت کلاینت دوباره اجرا نمی‌شه
  const sp = await searchParams;
  const filters = parseTransactionFilters(sp, "PAYMENT");
  const initial = await fetchTransactionsPage(filters);
  // لینک «ثبت پرداخت/برگشت» از صفحه‌ی سفارش: ?order=کد۸رقمی
  const order = toEnglishDigits(paramString(sp?.order, 20));
  const defaultOrderCode = /^\d{8}$/.test(order) ? order : "";

  return (
    <TransactionsAdmin
      key={JSON.stringify(filters) + defaultOrderCode}
      mode="PAYMENT"
      filters={filters}
      initial={initial}
      defaultOrderCode={defaultOrderCode}
    />
  );
}
