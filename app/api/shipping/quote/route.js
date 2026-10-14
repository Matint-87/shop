import { handler, ok, readJson } from "@/lib/api";
import { prisma } from "@/lib/db";
import { finalPriceOf } from "@/lib/product-constants";
import { shippingQuoteSchema } from "@/lib/schemas";
import { quoteShipping } from "@/lib/shipping-quote";

/**
 * عمومی: روش‌های ارسال فعال + هزینه و زمان تحویل برای یک شهر و یک سبد.
 * (فقط برای نمایش توی سبد؛ هزینه‌ی واقعی موقع ثبت سفارش دوباره سمت سرور حساب می‌شه.)
 */
export const POST = handler(async (request) => {
  const { province, city, latitude, longitude, items } = shippingQuoteSchema.parse(await readJson(request));

  // unit / amount / weightKg / volumeLiters برای محاسبه‌ی وزن و حجم سبد (هزینه‌ی پیک)
  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) }, isActive: true },
    select: { id: true, price: true, discountPercent: true, unit: true, amount: true, weightKg: true, volumeLiters: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines = [];
  let itemsPayable = 0;
  for (const i of items) {
    const p = byId.get(i.productId);
    if (!p) continue;
    itemsPayable += finalPriceOf(p.price, p.discountPercent) * i.quantity;
    lines.push({ product: p, quantity: i.quantity });
  }

  return ok(await quoteShipping({ province, city, itemsPayable, destination: { lat: latitude, lng: longitude }, lines }));
});
