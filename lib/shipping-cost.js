// فرمول هزینه‌ی ارسال با پیک بر اساس «مسافت + وزن/حجم + تعداد اقلام».
// بدون import سمت‌سروری، پس هم سرور (قیمت واقعی) و هم تست/کلاینت می‌تونن ازش استفاده کنن.

const KG_PER_MESGHAL = 0.004608; // هر مثقال ≈ ۴٫۶۰۸ گرم

/**
 * وزن «یک واحد فروش» (کیلوگرم):
 * ۱) اگه ادمین وزن رو وارد کرده همون
 * ۲) وگرنه از روی واحد و مقدار (کیلو/گرم/مثقال/لیتر)
 * ۳) وگرنه (عدد، باکس، کارتن، ...) وزن پیش‌فرضِ تنظیمات
 */
export function unitWeightKg(product, defaultItemWeightKg = 1) {
  if (product.weightKg != null && product.weightKg > 0) return product.weightKg;
  const amount = Number(product.amount) || 0;
  switch (product.unit) {
    case "KILOGRAM":
      return amount;
    case "GRAM":
      return amount / 1000;
    case "MESGHAL":
      return amount * KG_PER_MESGHAL;
    case "LITER":
      return amount; // هر لیتر ≈ ۱ کیلوگرم
    default:
      return defaultItemWeightKg;
  }
}

/** حجم «یک واحد فروش» (لیتر)؛ فقط وقتی معلومه که ادمین وارد کرده یا واحد فروش لیتره */
export function unitVolumeLiters(product) {
  if (product.volumeLiters != null && product.volumeLiters > 0) return product.volumeLiters;
  if (product.unit === "LITER") return Number(product.amount) || 0;
  return 0;
}

/**
 * بار کل سبد.
 * @param {Array<{product: object, quantity: number}>} lines
 * @param {{defaultItemWeightKg?: number, volumetricLitersPerKg?: number}} settings
 */
export function cartLoad(lines, settings = {}) {
  const defaultW = settings.defaultItemWeightKg ?? 1;
  const litersPerKg = settings.volumetricLitersPerKg > 0 ? settings.volumetricLitersPerKg : 5;
  let weightKg = 0;
  let volumeLiters = 0;
  let itemCount = 0;
  for (const { product, quantity } of lines) {
    weightKg += unitWeightKg(product, defaultW) * quantity;
    volumeLiters += unitVolumeLiters(product) * quantity;
    itemCount += quantity;
  }
  // وزن قابل‌محاسبه = بیشینه‌ی وزن واقعی و وزن حجمی (کالای حجیم ولی سبک هم گرون‌تر حمل می‌شه)
  const chargeableKg = Math.max(weightKg, volumeLiters / litersPerKg);
  return { weightKg, volumeLiters, itemCount, chargeableKg };
}

const roundUpTo = (value, step) => (step > 1 ? Math.ceil(value / step) * step : Math.round(value));

/**
 * هزینه‌ی پیک (تومان):
 * پایه + (کیلومتر بالاتر از «مسافت شامل‌شده» × هزینه‌ی هر کیلومتر)
 *      + (کیلوگرم بالاتر از «وزن شامل‌شده» × هزینه‌ی هر کیلو)
 *      + (تعداد بالاتر از «اقلام شامل‌شده» × هزینه‌ی هر قلم اضافه)
 * بعد حداقل/حداکثر اعمال و به مضرب roundTo گرد می‌شه.
 * @returns {{fee: number, parts: {base:number, distance:number, weight:number, items:number}}}
 */
export function computeCourierFee({ distanceKm, load, settings }) {
  const s = settings;
  const base = s.courierBaseFee;
  const distance = Math.max(0, distanceKm - s.courierIncludedKm) * s.courierPerKm;
  const weight = Math.max(0, load.chargeableKg - s.freeWeightKg) * s.perKgFee;
  const items = Math.max(0, load.itemCount - s.includedItems) * s.perExtraItemFee;

  let fee = base + distance + weight + items;
  fee = Math.max(fee, s.minFee);
  if (s.maxFee > 0) fee = Math.min(fee, s.maxFee);
  fee = roundUpTo(fee, s.roundTo);

  return {
    fee,
    parts: {
      base: Math.round(base),
      distance: Math.round(distance),
      weight: Math.round(weight),
      items: Math.round(items),
    },
  };
}

