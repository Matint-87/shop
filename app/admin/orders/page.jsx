import OrdersAdmin from "@/components/admin/OrdersAdmin";
import { fetchOrdersPage, parseOrderFilters } from "@/lib/admin-queries";
import { autoDeliverOverdue } from "@/lib/order-delivery";
import { requireAdmin } from "@/lib/dal";

export const metadata = { title: "سفارش‌ها | پنل مدیریت" };

export default async function AdminOrdersPage({ searchParams }) {
  await requireAdmin(); // دفاع در عمق: layout موقع ناوبری سمت کلاینت دوباره اجرا نمی‌شه
  await autoDeliverOverdue();
  const filters = parseOrderFilters(await searchParams);
  // فقط ۱۰ سفارش اول اینجا رندر می‌شه؛ بقیه با اسکرول از /api/admin/orders لود می‌شن
  const initial = await fetchOrdersPage(filters);

  return <OrdersAdmin key={JSON.stringify(filters)} filters={filters} initial={initial} />;
}
