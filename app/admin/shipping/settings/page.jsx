import ShippingSettingsForm from "@/components/admin/ShippingSettingsForm";
import { getShippingSettings } from "@/lib/settings";
import { requireAdmin } from "@/lib/dal";

export const metadata = { title: "تنظیمات ارسال | پنل مدیریت" };

export default async function AdminShippingSettingsPage() {
  await requireAdmin(); // دفاع در عمق: layout موقع ناوبری سمت کلاینت دوباره اجرا نمی‌شه
  const settings = await getShippingSettings();
  return <ShippingSettingsForm initial={settings} />;
}
