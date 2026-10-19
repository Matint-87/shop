import { buildMetadata } from "@/lib/seo";
import InfoPage, { P, PageLink, Section } from "@/components/pages/InfoPage";
import { STORE_INFO } from "@/lib/store-info";

export const metadata = buildMetadata({
  title: "درباره‌ی ما",
  description: `آشنایی با ${STORE_INFO.name}: فروشگاه آنلاین مایحتاج روزانه با قیمت مناسب و ارسال سریع.`,
  path: "/about",
});

export default function AboutPage() {
  return (
    <InfoPage title="درباره‌ی ما" intro={`با ${STORE_INFO.name} آشنا شوید.`}>
      <Section title={`${STORE_INFO.name} کیست؟`}>
        <P>
          {STORE_INFO.name} یک فروشگاه آنلاین مایحتاج روزانه است؛ از لبنیات و مواد غذایی تا بهداشتی و شوینده.
          هدف ما این است که خرید روزمره‌ی خانه را ساده، سریع و به‌صرفه کنید: کالا را از سایت انتخاب می‌کنید و ما آن را
          آماده و به دست شما می‌رسانیم.
        </P>
      </Section>

      <Section title="چرا از ما خرید کنید؟">
        <P>
          قیمت‌ها و موجودی کالاها همیشه به‌روز است و تخفیف‌ها در بخش{" "}
          <PageLink href="/products?discounted=1">کالاهای شگفت‌انگیز</PageLink> جمع شده‌اند. ارسال به‌صورت پست، پیک
          فروشگاه یا دریافت حضوری انجام می‌شود و در هر مرحله می‌توانید وضعیت سفارش خود را از بخش{" "}
          <PageLink href="/profile?tab=orders">سفارش‌های من</PageLink> پیگیری کنید.
        </P>
        <P>
          مبلغ سفارش هنگام تحویل (حضوری یا درب منزل) پرداخت می‌شود و در صورت داشتن اعتبار، می‌توانید از کیف پول خود هم استفاده کنید.
          اگر سفارشی لغو شود، مبلغ پرداخت‌شده به کیف پول شما برمی‌گردد.
        </P>
      </Section>

      <Section title="تعهد ما">
        <P>
          اصالت و کیفیت کالاها برای ما در اولویت است. اگر مشکلی در سفارش خود دیدید، با فروشگاه تماس بگیرید یا طبق
          شرایط صفحه‌ی <PageLink href="/returns">بازگشت و تعویض کالا</PageLink> به فروشگاه مراجعه کنید.
        </P>
      </Section>
    </InfoPage>
  );
}
