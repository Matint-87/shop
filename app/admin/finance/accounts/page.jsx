import PaymentAccountsAdmin from "@/components/admin/PaymentAccountsAdmin";
import { fetchPaymentAccounts } from "@/lib/admin-queries";
import { requireAdmin } from "@/lib/dal";

export const metadata = { title: "صندوق‌ها و بانک‌ها | پنل مدیریت" };

export default async function AdminPaymentAccountsPage() {
  await requireAdmin(); // دفاع در عمق: layout موقع ناوبری سمت کلاینت دوباره اجرا نمی‌شه
  const accounts = await fetchPaymentAccounts({ withStats: true });
  return <PaymentAccountsAdmin initial={accounts} />;
}
