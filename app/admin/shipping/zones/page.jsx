import ZonesAdmin from "@/components/admin/ZonesAdmin";
import { fetchZonesPage } from "@/lib/admin-queries";
import { requireAdmin } from "@/lib/dal";

export const metadata = { title: "محدوده‌های ارسال | پنل مدیریت" };

export default async function AdminZonesPage() {
  await requireAdmin(); // دفاع در عمق: layout موقع ناوبری سمت کلاینت دوباره اجرا نمی‌شه
  const initial = await fetchZonesPage();
  return <ZonesAdmin initial={initial} />;
}
