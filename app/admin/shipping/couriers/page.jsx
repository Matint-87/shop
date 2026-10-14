import CouriersAdmin from "@/components/admin/CouriersAdmin";
import { fetchCouriersPage, parseCourierFilters } from "@/lib/admin-queries";
import { requireAdmin } from "@/lib/dal";

export const metadata = { title: "پیک‌ها | پنل مدیریت" };

export default async function AdminCouriersPage({ searchParams }) {
  await requireAdmin(); // دفاع در عمق: layout موقع ناوبری سمت کلاینت دوباره اجرا نمی‌شه
  const filters = parseCourierFilters(await searchParams);
  const initial = await fetchCouriersPage(filters);
  return <CouriersAdmin key={JSON.stringify(filters)} filters={filters} initial={initial} />;
}
