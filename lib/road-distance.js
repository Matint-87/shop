// مسافت جاده‌ای (رانندگی) بین دو نقطه با OSRM (نقشه‌ی OpenStreetMap).
// پیش‌فرض: سرور دموی عمومی OSRM — فقط برای ترافیک کم/تست. برای پروداکشن سرور خودتون رو بالا بیارید
// و OSRM_URL رو ست کنید (مثلاً http://localhost:5000). شرایط: https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server
// اگه OSRM جواب نداد، فاصله‌ی خط مستقیم × ضریب (پیش‌فرض ۱٫۳) جایگزین می‌شه تا سفارش گیر نکنه.
import "server-only";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // مسیرها عوض نمی‌شن؛ ۶ ساعت کش
const CACHE_MAX = 1000;
const cache = new Map();

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return undefined;
  }
  return hit.value;
}

function cacheSet(key, value) {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value); // قدیمی‌ترین
  cache.set(key, { at: Date.now(), value });
}

/** فاصله‌ی خط مستقیم (کیلومتر) با فرمول Haversine */
export function haversineKm(a, b) {
  const R = 6371;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * @param {{lat:number,lng:number}} from  فروشگاه
 * @param {{lat:number,lng:number}} to    مقصد
 * @returns {Promise<{km: number, source: "osrm"|"estimate"}>}
 */
export async function roadDistanceKm(from, to) {
  // مختصات رو گرد می‌کنیم (~۱۱ متر) تا کش بهتر کار کنه
  const key = `${from.lat.toFixed(4)},${from.lng.toFixed(4)}>${to.lat.toFixed(4)},${to.lng.toFixed(4)}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  const base = (process.env.OSRM_URL || "https://router.project-osrm.org").replace(/\/+$/, "");
  // نکته: ترتیب مختصات توی OSRM «طول، عرض» (lng,lat) هست، برعکس لیفلت
  const url = `${base}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false&alternatives=false&steps=false`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": process.env.GEOCODE_USER_AGENT || "sopermarket-shop/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`osrm http ${res.status}`);
    const data = await res.json();
    const meters = data?.routes?.[0]?.distance;
    if (data?.code !== "Ok" || !Number.isFinite(meters)) throw new Error(`osrm code ${data?.code}`);
    const result = { km: meters / 1000, source: "osrm" };
    cacheSet(key, result);
    return result;
  } catch (err) {
    console.error("[osrm error]", err instanceof Error ? err.message : err);
    const factor = Number(process.env.ROAD_FACTOR) || 1.3; // مسیر واقعی معمولاً ~۳۰٪ بلندتر از خط مستقیمه
    // نتیجه‌ی تخمینی کش نمی‌شه تا بعد از برگشتنِ OSRM مقدار دقیق جایگزین بشه
    return { km: haversineKm(from, to) * factor, source: "estimate" };
  }
}
