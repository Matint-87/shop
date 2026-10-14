import StoreStatusAdmin from "@/components/admin/StoreStatusAdmin";
import { getStoreStatus } from "@/lib/settings";
import { requireAdmin } from "@/lib/dal";

export const metadata = { title: "وضعیت فروشگاه | پنل مدیریت" };

export default async function AdminStoreStatusPage() {
  await requireAdmin(); // دفاع در عمق: layout موقع ناوبری سمت کلاینت دوباره اجرا نمی‌شه
  const status = await getStoreStatus();
  return <StoreStatusAdmin initial={status} />;
}
