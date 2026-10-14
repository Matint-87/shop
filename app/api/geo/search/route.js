import { handler, ok } from "@/lib/api";
import { requireApiUser } from "@/lib/dal";
import { searchPlaces } from "@/lib/geocode";
import { rateLimit } from "@/lib/rate-limit";

/**
 * GET /api/geo/search?q=..
 * جست‌وجوی متنی مکان برای کادر جست‌وجوی نقشه (فقط کاربر واردشده، با سقف تعداد درخواست).
 */
export const GET = handler(async (request) => {
  const user = await requireApiUser();
  await rateLimit(`geosearch:${user.id}`, 30, 600, "تعداد جست‌وجوها زیاد بوده؛ کمی بعد تلاش کنید");
  const q = request.nextUrl.searchParams.get("q") ?? "";
  return ok({ results: await searchPlaces(q) });
});
