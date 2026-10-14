import AddressesAdmin from "@/components/admin/AddressesAdmin";
import { fetchAddressesPage, parseAddressFilters } from "@/lib/admin-queries";
import { requireAdmin } from "@/lib/dal";

export const metadata = { title: "آدرس‌ها | پنل مدیریت" };

export default async function AdminAddressesPage({ searchParams }) {
  await requireAdmin(); // دفاع در عمق: layout موقع ناوبری سمت کلاینت دوباره اجرا نمی‌شه
  const filters = parseAddressFilters(await searchParams);
  const initial = await fetchAddressesPage(filters);
  return <AddressesAdmin key={JSON.stringify(filters)} filters={filters} initial={initial} />;
}
