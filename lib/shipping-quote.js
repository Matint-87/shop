// محاسبه‌ی هزینه و زمان ارسال از روی «محدوده‌های ارسال» و «تنظیمات ارسال» پنل مدیریت.
// هم API عمومی /api/shipping/quote (نمایش توی سبد) و هم ثبت سفارش (قیمت واقعی، سمت سرور) از همین‌جا استفاده می‌کنن.
import "server-only";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api";
import { getShippingSettings } from "@/lib/settings";
import { roadDistanceKm } from "@/lib/road-distance";
import { availableSlots, slotToday } from "@/lib/delivery-slots";
import { POST_SHIPPING_OFFERED, SHIPPING_METHODS, isTehranCity } from "@/lib/shipping";
import { cartLoad, computeCourierFee } from "@/lib/shipping-cost";
import { normalizeText } from "@/lib/text";

const same = (a, b) => normalizeText(a) === normalizeText(b);

/** مشخص‌ترین محدوده‌ی فعال: شهر مشخص > استان > کل کشور؛ در تساوی، sortOrder کوچک‌تر */
function matchZone(zones, province, city) {
  let best = null;
  let bestScore = -1;
  for (const z of zones) {
    if (z.province && !same(z.province, province)) continue;
    const hasCities = (z.cities ?? []).length > 0;
    if (hasCities && !z.cities.some((c) => same(c, city))) continue;
    const score = hasCities ? 2 : z.province ? 1 : 0;
    if (score > bestScore) {
      best = z;
      bestScore = score;
    }
  }
  return best;
}

/**
 * هزینه‌ی پیک بر اساس مسافت جاده‌ای (OSRM) + وزن/حجم/تعداد.
 * اگه قابل محاسبه نباشه (خاموش، بدون مختصات فروشگاه یا مقصد) null برمی‌گردونه و پیک مثل قبل از محدوده‌ها حساب می‌شه.
 * @returns {Promise<null | {fee:number, distanceKm:number, distanceSource:string, parts:object, load:object, outOfRange:boolean}>}
 */
async function courierDistanceQuote({ settings, destination, lines }) {
  if (!settings.distanceEnabled || settings.storeLat == null || settings.storeLng == null) return null;
  if (!destination || destination.lat == null || destination.lng == null) return null;
  if (!lines || lines.length === 0) return null;

  const { km, source } = await roadDistanceKm(
    { lat: Number(settings.storeLat), lng: Number(settings.storeLng) },
    { lat: destination.lat, lng: destination.lng },
  );
  const distanceKm = Math.round(km * 10) / 10;
  const load = cartLoad(lines, settings);
  const { fee, parts } = computeCourierFee({ distanceKm, load, settings });
  const outOfRange = settings.maxDeliveryKm > 0 && distanceKm > settings.maxDeliveryKm;
  return { fee, distanceKm, distanceSource: source, parts, load, outOfRange };
}

/**
 * @param {{province: string, city: string, itemsPayable: number, destination?: {lat:number|null,lng:number|null}, lines?: Array<{product: object, quantity: number}>}} args
 *   itemsPayable = جمع کالاها بعد از تخفیف؛ destination و lines برای محاسبه‌ی مسافتی/وزنیِ پیک (اختیاری)
 * @returns {Promise<{methods: Array, pickupAddress: string, note: string}>}
 */
export async function quoteShipping({ province, city, itemsPayable, destination = null, lines = null }) {
  const [settings, zones] = await Promise.all([
    getShippingSettings(),
    prisma.shippingZone.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
  ]);

  const zone = matchZone(zones, province, city);
  const baseFee = zone ? zone.fee : settings.defaultFee;
  // ارسال رایگان: سقفِ همون محدوده؛ اگه محدوده‌ای پیدا نشد سقفِ عمومی (صفر = نداریم)
  const freeOver = zone ? zone.freeOver : settings.freeShippingOver > 0 ? settings.freeShippingOver : null;
  const isFree = baseFee === 0 || (freeOver != null && itemsPayable >= freeOver);
  const shipFee = isFree ? 0 : baseFee;

  const fallbackTime = isTehranCity(city) ? settings.tehranDeliveryTime : settings.otherDeliveryTime;
  const deliveryTime = zone?.deliveryTime || fallbackTime || null;

  // پیک: اگه مسافت قابل محاسبه بود، قیمتش از فرمول مسافت/وزن میاد (پست همچنان از محدوده‌ها)
  const distance = await courierDistanceQuote({ settings, destination, lines });
  const needsLocation = settings.distanceEnabled && settings.storeLat != null && !distance; // آدرس مختصات نداره

  // پست فقط برای تهران (قابل خاموش‌شدن از تنظیمات ارسال)؛ چون quoteForMethod هم از همین‌جا میاد، ثبت سفارش سمت سرور هم بلاک می‌شه
  const postBlockedByCity = POST_SHIPPING_OFFERED && Boolean(settings.postTehranOnly) && !isTehranCity(city);
  // حداقل مبلغ سفارش برای پیک: مبلغ کالاها بعد از تخفیف (بدون هزینه‌ی ارسال) با این سقف مقایسه می‌شه؛ صفر = محدودیت نداریم
  const courierMinOrder = Math.max(0, Number(settings.courierMinOrder) || 0);
  const courierBelowMin = settings.courierEnabled && courierMinOrder > 0 && itemsPayable < courierMinOrder;
  const enabled = { POST: POST_SHIPPING_OFFERED && settings.postEnabled && !postBlockedByCity, COURIER: settings.courierEnabled && !courierBelowMin, PICKUP: settings.pickupEnabled };
  const methods = SHIPPING_METHODS.map((m) => {
    const base = {
      value: m.value,
      label: m.label,
      description: m.description,
      enabled: Boolean(enabled[m.value]),
      fee: m.value === "PICKUP" ? 0 : shipFee,
      // فقط وقتی «رایگان» نشون داده می‌شه که واقعاً هزینه‌ای بوده و حذف شده
      freeApplied: m.value !== "PICKUP" && baseFee > 0 && isFree,
      freeOver: m.value !== "PICKUP" ? freeOver : null,
      deliveryTime: m.value === "PICKUP" ? null : deliveryTime,
    };
    if (m.value === "POST" && postBlockedByCity) {
      return { ...base, tehranOnly: true };
    }
    if (m.value === "POST" && settings.postFreightCollect) {
      // پس‌کرایه: مشتری هزینه‌ی پست رو موقع تحویل به پست می‌پردازه؛ فروشگاه چیزی از او نمی‌گیره
      return { ...base, fee: 0, freeApplied: false, freeOver: null, freightCollect: true };
    }
    if (m.value !== "COURIER") return base;

    // زیر حداقل سفارشِ پیک: غیرفعال؛ مشتری فقط می‌تونه روش‌های دیگه (مثلاً دریافت حضوری) رو انتخاب کنه
    if (courierBelowMin) {
      return { ...base, enabled: false, belowMinOrder: true, minOrder: courierMinOrder, missingAmount: courierMinOrder - itemsPayable };
    }

    if (needsLocation) {
      // مختصات مقصد نداریم → فعلاً هزینه‌ی محدوده؛ به کاربر گفته می‌شه موقعیت آدرس رو روی نقشه بزنه
      return { ...base, needsLocation: true };
    }
    if (!distance) return base;

    // خارج از شعاع پیک: غیرفعال
    if (distance.outOfRange) {
      return { ...base, enabled: false, distanceKm: distance.distanceKm, outOfRange: true };
    }
    // سقف ارسال رایگان همچنان اعمال می‌شه (سقف همون محدوده/تنظیمات عمومی)
    const free = freeOver != null && itemsPayable >= freeOver;
    return {
      ...base,
      fee: free ? 0 : distance.fee,
      freeApplied: free && distance.fee > 0,
      freeOver,
      distanceKm: distance.distanceKm,
      distanceSource: distance.distanceSource,
      feeParts: distance.parts,
      weightKg: Math.round(distance.load.chargeableKg * 10) / 10,
      itemCount: distance.load.itemCount,
    };
  });

  // زمان‌های قابل انتخاب برای تحویل/دریافت (پیک و حضوری)؛ موقع ثبت سفارش دوباره سمت سرور چک می‌شه
  const now = new Date();
  const slots = { today: slotToday(now), COURIER: availableSlots("COURIER", now), PICKUP: availableSlots("PICKUP", now) };

  return { methods, slots, pickupAddress: settings.pickupAddress || "", note: settings.note || "" };
}

/** برای ثبت سفارش: یک روش مشخص رو چک می‌کنه (فعال بودن) و هزینه/زمانش رو برمی‌گردونه */
export async function quoteForMethod({ method, province, city, itemsPayable, destination, lines }) {
  const q = await quoteShipping({ province, city, itemsPayable, destination, lines });
  const m = q.methods.find((x) => x.value === method);
  // پیام مشخص برای حداقل سفارش پیک (سمت سرور هم بلاک می‌شه؛ فقط مخفی کردن دکمه توی UI کافی نیست)
  if (m && m.belowMinOrder) {
    throw new ApiError(400, `حداقل مبلغ سفارش برای ارسال با پیک ${m.minOrder.toLocaleString("fa-IR")} تومان است. دریافت حضوری را انتخاب کنید یا کالای بیشتری به سبد اضافه کنید.`);
  }
  return m && m.enabled ? m : null;
}
