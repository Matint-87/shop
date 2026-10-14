// مشخصات فروشنده که روی فاکتور، فوتر و صفحه‌ی «تماس با ما» نمایش داده می‌شه. خالی‌ها نمایش داده نمی‌شن.
export const STORE_INFO = {
  name: "سوپرمارکت رحیمی",
  phone: "021-44301212", // تلفن فروشگاه (نمایش با ارقام فارسی و لینک tel: خودکار ساخته می‌شه)
  address: "کن-الغدیر یکم-چهار راه شیدا-نبش کوچه حسن زاده-پلاک 416", // آدرس فروشگاه
  workingHours: "همه‌روزه از ساعت ۹ صبح تا ۶:۳۰ عصر", // نمایش به کاربر؛ با ساعت‌های lib/delivery-slots.js هماهنگ نگه دار
  openingHoursSchema: "Mo-Su 09:00-18:30", // فرمت schema.org برای گوگل
  email: "",
  economicCode: "", // کد اقتصادی (اختیاری)
  website: "",
};

// سیاست بازگشت کالا (در صفحه‌ی «بازگشت کالا» و «سوالات متداول» استفاده می‌شه)
// فقط با مراجعه‌ی حضوری به فروشگاه؛ برای عوض‌کردن مهلت فقط همین عدد رو ویرایش کن.
export const RETURN_WINDOW_DAYS = 3;

// شکل‌های آماده‌ی همین شماره: نمایش با ارقام فارسی، لینک tel: و فرمت بین‌المللی برای داده‌ی ساختاریِ گوگل
const FA = "۰۱۲۳۴۵۶۷۸۹";
export const STORE_PHONE_FA = STORE_INFO.phone.replace(/\d/g, (d) => FA[d]);
const phoneDigits = STORE_INFO.phone.replace(/\D/g, "");
export const STORE_PHONE_TEL = phoneDigits ? `tel:${phoneDigits}` : "";
export const STORE_PHONE_E164 = phoneDigits ? `+98${phoneDigits.replace(/^0/, "")}` : "";
