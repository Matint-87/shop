import TransactionsAdmin from "@/components/admin/TransactionsAdmin";
import { fetchPaymentAccounts, fetchTransactionsPage, parseTransactionFilters } from "@/lib/admin-queries";
import { paramString } from "@/lib/admin-dal";
import { toEnglishDigits } from "@/lib/phone";
import { requireAdmin } from "@/lib/dal";

export const metadata = { title: "تراکنش‌ها | پنل مدیریت" };

export default async function AdminTransactionsPage({ searchParams }) {
  await requireAdmin(); // دفاع در عمق: layout موقع ناوبری سمت کلاینت دوباره اجرا نمی‌شه
  const sp = await searchParams;
  const filters = parseTransactionFilters(sp, "");
  const [initial, accounts] = await Promise.all([fetchTransactionsPage(filters), fetchPaymentAccounts()]);
  // لینک «ثبت پرداخت/برگشت» از صفحه‌ی سفارش: ?order=کد۸رقمی
  const order = toEnglishDigits(paramString(sp?.order, 20));
  const defaultOrderCode = /^\d{8}$/.test(order) ? order : "";

  return (
    <TransactionsAdmin
      key={JSON.stringify(filters) + defaultOrderCode}
      mode="ALL"
      filters={filters}
      initial={initial}
      accounts={accounts}
      defaultOrderCode={defaultOrderCode}
    />
  );
}
