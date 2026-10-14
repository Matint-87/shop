import ActivityAdmin from "@/components/admin/ActivityAdmin";
import { fetchActivityPage, parseActivityFilters } from "@/lib/admin-queries";
import { requireAdmin } from "@/lib/dal";

export const metadata = { title: "لاگ فعالیت‌ها | پنل مدیریت" };

export default async function AdminActivityPage({ searchParams }) {
  await requireAdmin(); // دفاع در عمق: layout موقع ناوبری سمت کلاینت دوباره اجرا نمی‌شه
  const filters = parseActivityFilters(await searchParams);
  const initial = await fetchActivityPage(filters);
  return <ActivityAdmin key={JSON.stringify(filters)} filters={filters} initial={initial} />;
}
