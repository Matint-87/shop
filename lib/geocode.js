// تبدیل مختصات نقشه به آدرس (Reverse Geocoding) با API سازگار با Nominatim.
// پیش‌فرض: سرور عمومی OpenStreetMap (برای ترافیک کم). برای ترافیک بالا سرور اختصاصی راه بندازید
// و GEOCODE_URL رو تغییر بدید (شرایط استفاده: https://operations.osmfoundation.org/policies/nominatim/).
import "server-only";
import { getCity, getProvince, getProvincesList } from "@code-plate/iran-cities";
import { normalizeText } from "@/lib/text";
import { toEnglishDigits } from "@/lib/phone";
import { isValidPostalCode } from "@/lib/validators";

const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 500;
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

// اسم کامل نوع معبر رو به شکل کوتاه و مرسومش تبدیل می‌کنه (خیابان ابراهیمی → خ. ابراهیمی)
function abbreviateWay(value) {
  return normalizeText(value)
    .replace(/^بلوار\s+/, "بل ")
    .replace(/^خیابان\s+/, "خ. ")
    .replace(/^کوچه‌?ی?\s+/, "ک. ")
    .replace(/^بزرگراه\s+/, "بزرگراه ")
    .replace(/^میدان\s+/, "میدان ");
}

const CITY_KEYS = ["city", "town", "village", "municipality", "city_district", "county", "state_district"];
const WAY_KEYS = ["road", "pedestrian", "footway", "residential", "path", "living_street", "service", "cycleway"];

function cleanCityName(value) {
  return normalizeText(value || "")
    .replace(/^شهرستان\s+/, "")
    .replace(/^شهر\s+/, "")
    .replace(/^بخش\s+/, "");
}

// اگه استان از نقشه نیومد ولی شهر اومد، از روی شهر استان رو پیدا می‌کنیم
function findCityAnywhere(name) {
  for (const p of getProvincesList()) {
    const c = getCity(name, p.en);
    if (c) return { province: p, city: c };
  }
  return null;
}

function mapAddress(a = {}) {
  const stateName = normalizeText(a.state || a.province || "")
    .replace(/^استان\s+/, "")
    .replace(/\s+Province$/i, "");
  let province = stateName ? getProvince(stateName) : null;

  // شهر: چند کاندیدا رو به ترتیب اولویت امتحان می‌کنیم تا اولین موردی که تو لیست شهرهای ایران هست
  const cityCandidates = [...new Set(CITY_KEYS.map((k) => cleanCityName(a[k])).filter(Boolean))];
  let city = null;
  for (const name of cityCandidates) {
    if (province) city = getCity(name, province.en);
    if (city) break;
  }
  if (!city && !province) {
    for (const name of cityCandidates) {
      const hit = findCityAnywhere(name);
      if (hit) {
        province = hit.province;
        city = hit.city;
        break;
      }
    }
  }

  const postal = a.postcode ? toEnglishDigits(a.postcode).trim() : "";

  // محله: مشخص‌ترین سطح محلی که نومیناتیم برگردونده
  const neighborhoodRaw = normalizeText(a.neighbourhood || a.suburb || a.quarter || a.city_district || a.hamlet || "");
  const neighborhood = neighborhoodRaw || null;

  // «آدرس کامل»: بقیه‌ی سطح‌های محلی (شهرک/ناحیه/...، غیر از چیزی که به‌عنوان «محله» انتخاب شد) + نام معبر،
  // با علامت اختصاری مرسوم (خ./بل). اگه معبری نبود، حداقل نزدیک‌ترین مکان نام‌دار (مثلاً مرکز خرید) رو می‌ذاریم.
  const localityParts = [a.quarter, a.suburb, a.neighbourhood, a.city_district]
    .map((v) => normalizeText(v || ""))
    .filter((v) => v && v !== neighborhoodRaw);
  const uniqueLocalities = [...new Set(localityParts)];
  const wayRaw = WAY_KEYS.map((k) => a[k]).find(Boolean);
  const roadPart = wayRaw ? abbreviateWay(wayRaw) : "";
  const placeName = !roadPart
    ? normalizeText(a.amenity || a.shop || a.building || a.leisure || a.tourism || a.office || "")
    : "";
  const addressLine = [...uniqueLocalities, roadPart, placeName].filter(Boolean).join("، ") || null;

  return {
    province: province?.fa ?? null,
    city: city?.fa ?? null,
    neighborhood,
    addressLine,
    plaque: normalizeText(a.house_number || "") || null,
    postalCode: isValidPostalCode(postal) ? postal : null,
  };
}

/** خروجی: { found, ...فیلدهای آدرس } — در خطای شبکه هم خطا پرتاب نمی‌کنه؛ کاربر می‌تونه دستی پر کنه */
export async function reverseGeocode(lat, lng) {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  const base = process.env.GEOCODE_URL || "https://nominatim.openstreetmap.org/reverse";
  const url = new URL(base);
  url.search = new URLSearchParams({
    format: "jsonv2",
    lat: String(lat),
    lon: String(lng),
    zoom: "18",
    addressdetails: "1",
    "accept-language": "fa",
  }).toString();

  try {
    const res = await fetch(url, {
      headers: {
        // Nominatim یک User-Agent معتبر می‌خواد؛ ترجیحاً با راه ارتباطی شما
        "User-Agent": process.env.GEOCODE_USER_AGENT || "sopermarket-shop/1.0",
        "Accept-Language": "fa",
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error(`geocoder http ${res.status}`);
    const data = await res.json();
    const fields = mapAddress(data?.address);
    const found = Boolean(fields.province || fields.city || fields.addressLine);
    const result = { found, ...fields };
    if (found) cacheSet(key, result);
    return result;
  } catch (err) {
    console.error("[geocode error]", err instanceof Error ? err.message : err);
    return { found: false };
  }
}

/**
 * جست‌وجوی متنی آدرس/مکان (فقط داخل ایران) برای کادر جست‌وجوی نقشه.
 * خروجی: [{ label, lat, lng }] — در خطا آرایه‌ی خالی برمی‌گردونه.
 */
export async function searchPlaces(query) {
  const q = normalizeText(query).slice(0, 120);
  if (q.length < 3) return [];
  const key = `s:${q}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  const base = process.env.GEOCODE_SEARCH_URL || "https://nominatim.openstreetmap.org/search";
  const url = new URL(base);
  url.search = new URLSearchParams({
    format: "jsonv2",
    q,
    countrycodes: "ir",
    limit: "6",
    addressdetails: "0",
    "accept-language": "fa",
  }).toString();

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": process.env.GEOCODE_USER_AGENT || "sopermarket-shop/1.0",
        "Accept-Language": "fa",
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error(`geocoder http ${res.status}`);
    const data = await res.json();
    const results = (Array.isArray(data) ? data : [])
      .map((r) => ({ label: normalizeText(r.display_name || ""), lat: Number(r.lat), lng: Number(r.lon) }))
      .filter((r) => r.label && Number.isFinite(r.lat) && Number.isFinite(r.lng));
    if (results.length) cacheSet(key, results);
    return results;
  } catch (err) {
    console.error("[geocode search error]", err instanceof Error ? err.message : err);
    return [];
  }
}
