import BannersAdmin from "@/components/admin/BannersAdmin";
import { getAllBanners } from "@/lib/banners";
import { requireAdmin } from "@/lib/dal";

export const metadata = { title: "بنرهای صفحه‌ی اصلی | پنل مدیریت" };

export default async function AdminBannersPage() {
  await requireAdmin(); // دفاع در عمق: layout موقع ناوبری سمت کلاینت دوباره اجرا نمی‌شه
  const banners = await getAllBanners();
  return <BannersAdmin initial={banners} />;
}
