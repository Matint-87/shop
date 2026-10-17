import "./globals.css";
import AppProviders from "@/components/providers/AppProviders";
import { PALETTE_BY_ID, DEFAULT_PALETTE } from "@/lib/palettes";
import { getSitePalette } from "@/lib/settings";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { STORE_INFO, STORE_PHONE_E164 } from "@/lib/store-info";
import { JsonLd, DEFAULT_OG_IMAGE } from "@/lib/seo";
import { SITE_DESCRIPTION, SITE_KEYWORDS, SITE_NAME, SITE_TITLE, SITE_URL, absUrl } from "@/lib/site";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  // صفحه‌ها فقط بخش اختصاصی عنوان رو می‌دن؛ «| نام فروشگاه» خودکار اضافه می‌شه
  title: { default: SITE_TITLE, template: `%s | ${SITE_NAME}` },
  keywords: SITE_KEYWORDS,
  // کد تأیید مالکیت Search Console (متغیر GOOGLE_SITE_VERIFICATION توی .env)؛ خالی باشه تگی ساخته نمی‌شه
  ...(process.env.GOOGLE_SITE_VERIFICATION && { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }),
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  // canonical عمداً اینجا نیست: اگه توی layout ریشه باشه، هر صفحه‌ای که canonical خودش رو نداره به «/» اشاره می‌کنه
  openGraph: {
    type: "website",
    locale: "fa_IR",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: { card: "summary_large_image", title: SITE_TITLE, description: SITE_DESCRIPTION, images: [DEFAULT_OG_IMAGE] },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  formatDetection: { telephone: false },
};

// داده‌ی ساختاریِ سراسری: معرفی فروشگاه + کادر جستجوی سایت در گوگل
function siteJsonLd() {
  const store = {
    "@type": "GroceryStore",
    "@id": absUrl("/#store"),
    name: SITE_NAME,
    alternateName: STORE_INFO.alternateNames,
    url: absUrl("/"),
    logo: absUrl("/icon.png"),
    image: absUrl(DEFAULT_OG_IMAGE),
    description: SITE_DESCRIPTION,
    priceRange: "$$",
    currenciesAccepted: "IRR",
    ...(STORE_INFO.phone && { telephone: STORE_PHONE_E164 }),
    ...(STORE_INFO.email && { email: STORE_INFO.email }),
    ...(STORE_INFO.openingHoursSchema && { openingHours: STORE_INFO.openingHoursSchema }),
    ...(STORE_INFO.address && {
      address: {
        "@type": "PostalAddress",
        streetAddress: STORE_INFO.address,
        ...(STORE_INFO.city && { addressLocality: STORE_INFO.city }),
        addressCountry: "IR",
      },
    }),
    ...(STORE_INFO.city && { areaServed: { "@type": "City", name: STORE_INFO.city } }),
    ...(STORE_INFO.geo?.lat && STORE_INFO.geo?.lng && {
      geo: { "@type": "GeoCoordinates", latitude: STORE_INFO.geo.lat, longitude: STORE_INFO.geo.lng },
    }),
    ...(STORE_INFO.sameAs?.length && { sameAs: STORE_INFO.sameAs }),
  };
  const website = {
    "@type": "WebSite",
    "@id": absUrl("/#website"),
    url: absUrl("/"),
    name: SITE_NAME,
    alternateName: STORE_INFO.alternateNames,
    inLanguage: "fa-IR",
    publisher: { "@id": absUrl("/#store") },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${absUrl("/products")}?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
  return { "@context": "https://schema.org", "@graph": [store, website] };
}

// پالت رنگی انتخاب‌شده از پنل مدیریت؛ رنگ نوار مرورگر موبایل هم با همون پالت هماهنگ می‌شه
export async function generateViewport() {
  const tc = PALETTE_BY_ID[await getSitePalette()].themeColor;
  return {
    width: "device-width",
    initialScale: 1,
    // بدون این، env(safe-area-inset-bottom) روی آیفون همیشه صفره و منوی پایین روی نوار Home می‌افته
    viewportFit: "cover",
    // رنگ نوار مرورگر موبایل با پالت و تم دستگاه هماهنگ می‌شه
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: tc.light },
      { media: "(prefers-color-scheme: dark)", color: tc.dark },
    ],
    colorScheme: "light dark",
  };
}

export default async function RootLayout({ children }) {
  const palette = await getSitePalette();
  return (
    // suppressHydrationWarning: اسکریپت تم قبل از هیدریت کلاس dark رو روی <html> می‌ذاره
    <html
      lang="fa"
      dir="rtl"
      className="font-sans"
      data-palette={palette === DEFAULT_PALETTE ? undefined : palette}
      suppressHydrationWarning
    >
      <head>
        {/* فونت اصلی سایت از همون اول دانلود بشه تا متن‌ها با فونت پیش‌فرض نپرن */}
        <link rel="preload" href="/font/Vazirmatn-FD-Medium.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <JsonLd data={siteJsonLd()} />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
