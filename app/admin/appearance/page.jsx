import SitePaletteAdmin from "@/components/admin/SitePaletteAdmin";
import { getSitePalette } from "@/lib/settings";
import { requireAdmin } from "@/lib/dal";

export const metadata = { title: "پالت رنگی سایت | پنل مدیریت" };
export const dynamic = "force-dynamic";

export default async function AdminAppearancePage() {
  await requireAdmin(); // دفاع در عمق: layout موقع ناوبری سمت کلاینت دوباره اجرا نمی‌شه
  const palette = await getSitePalette();
  return <SitePaletteAdmin initial={palette} />;
}
