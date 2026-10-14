import { buildMetadata } from "@/lib/seo";
import InfoPage, { List, P, Section } from "@/components/pages/InfoPage";
import { prisma } from "@/lib/db";
import { SLOT_DAYS_AHEAD, SLOT_LEAD_MINUTES } from "@/lib/delivery-slots";
import { formatToman } from "@/lib/format";
import { toFaDigits } from "@/lib/phone";
import { getShippingSettings } from "@/lib/settings";
import { POST_SHIPPING_OFFERED, SHIPPING_METHODS } from "@/lib/shipping";
import { STORE_INFO } from "@/lib/store-info";

export const metadata = buildMetadata({
  title: "هزینه و زمان ارسال",
  description: `هزینه، زمان و روش‌های ارسال سفارش از ${STORE_INFO.name}؛ پست، پیک فروشگاه و دریافت حضوری.`,
  path: "/shipping-info",
});

// هزینه‌ها از پنل مدیریت می‌آن؛ پس صفحه نباید موقع build ثابت بشه
export const dynamic = "force-dynamic";

async function loadShipping() {
  try {
    const [settings, zones] = await Promise.all([
      getShippingSettings(),
      prisma.shippingZone.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    ]);
    return { settings, zones };
  } catch (err) {
    console.error("[shipping-info]", err);
    return null;
  }
}

const leadText = (min) => (min % 60 === 0 ? `${toFaDigits(min / 60)} ساعت` : `${toFaDigits(min)} دقیقه`);

const feeText = (fee) => (fee > 0 ? formatToman(fee) : "رایگان");

function zoneCoverage(z) {
  const cities = z.cities ?? [];
  if (cities.length > 0) return `${cities.join("، ")}${z.province ? ` (${z.province})` : ""}`;
  return z.province || "سراسر کشور";
}

export default async function ShippingInfoPage() {
  const data = await loadShipping();

  if (!data) {
    return (
      <InfoPage title="هزینه و زمان ارسال">
        <P>اطلاعات ارسال در حال حاضر در دسترس نیست. لطفاً کمی بعد دوباره سر بزنید.</P>
      </InfoPage>
    );
  }

  const { settings, zones } = data;
  const enabled = { POST: POST_SHIPPING_OFFERED && settings.postEnabled, COURIER: settings.courierEnabled, PICKUP: settings.pickupEnabled };
  const methods = SHIPPING_METHODS.filter((m) => enabled[m.value]);
  const pickupAddress = settings.pickupAddress || STORE_INFO.address;

  return (
    <InfoPage title="هزینه و زمان ارسال" intro="هزینه‌ی دقیق ارسال هنگام انتخاب روش ارسال در سبد خرید نمایش داده می‌شود.">
      <Section title="روش‌های ارسال">
        {methods.length > 0 ? (
          <List items={methods.map((m) => `${m.label}: ${m.description}`)} />
        ) : (
          <P>در حال حاضر هیچ روش ارسالی فعال نیست.</P>
        )}
        {enabled.POST && settings.postTehranOnly && <P>ارسال با پست فعلاً فقط برای شهر تهران انجام می‌شود.</P>}
        {enabled.PICKUP && pickupAddress && <P>آدرس تحویل حضوری: {pickupAddress}</P>}
      </Section>

      {(enabled.COURIER || enabled.PICKUP) && (
        <Section title="زمان تحویل">
          <P>
            هنگام ثبت سفارش، تاریخ و ساعت دریافت سفارش را خودتان انتخاب می‌کنید. فروشگاه همه‌روزه از ساعت ۹ صبح تا ۶:۳۰ عصر فعال است و
            بازه‌های یک‌ساعته تا {toFaDigits(SLOT_DAYS_AHEAD)} روز آینده قابل انتخاب است.
          </P>
          <List
            items={[
              enabled.COURIER && `ارسال با پیک: حداقل ${leadText(SLOT_LEAD_MINUTES.COURIER)} بعد از ثبت سفارش`,
              enabled.PICKUP && `دریافت حضوری: حداقل ${leadText(SLOT_LEAD_MINUTES.PICKUP)} بعد از ثبت سفارش`,
            ].filter(Boolean)}
          />
        </Section>
      )}

      {enabled.POST && (
        <Section title="زمان ارسال">
          <List
            items={[
              settings.tehranDeliveryTime && `تهران: ${settings.tehranDeliveryTime}`,
              settings.otherDeliveryTime && `سایر شهرها: ${settings.otherDeliveryTime}`,
            ].filter(Boolean)}
          />
          <P>برای برخی محدوده‌ها زمان یا هزینه‌ی جداگانه تعریف شده است (جدول زیر).</P>
        </Section>
      )}

      {(enabled.POST || enabled.COURIER) && (
        <Section title="هزینه‌ی ارسال">
          {zones.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
              <table className="w-full min-w-[480px] text-start text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                    <th className="px-3 py-2.5 text-start font-medium">محدوده</th>
                    <th className="px-3 py-2.5 text-start font-medium">هزینه</th>
                    <th className="px-3 py-2.5 text-start font-medium">ارسال رایگان از</th>
                    {enabled.POST && <th className="px-3 py-2.5 text-start font-medium">زمان</th>}
                  </tr>
                </thead>
                <tbody>
                  {zones.map((z) => (
                    <tr key={z.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-2.5 font-medium text-slate-800">{zoneCoverage(z)}</td>
                      <td className="px-3 py-2.5 text-slate-600">{feeText(z.fee)}</td>
                      <td className="px-3 py-2.5 text-slate-600">{z.fee > 0 && z.freeOver ? formatToman(z.freeOver) : "—"}</td>
                      {enabled.POST && <td className="px-3 py-2.5 text-slate-600">{z.deliveryTime || "—"}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <P>
              هزینه‌ی ارسال: {feeText(settings.defaultFee)}
              {settings.defaultFee > 0 && settings.freeShippingOver > 0 && ` (ارسال رایگان برای خرید بالای ${formatToman(settings.freeShippingOver)})`}
            </P>
          )}
          {zones.length > 0 && (
            <P>
              برای آدرس‌هایی که در این جدول نیستند، هزینه‌ی ارسال {feeText(settings.defaultFee)} است
              {settings.defaultFee > 0 && settings.freeShippingOver > 0 && ` و برای خرید بالای ${formatToman(settings.freeShippingOver)} رایگان می‌شود`}.
            </P>
          )}
          {enabled.COURIER && settings.courierMinOrder > 0 && <P>حداقل مبلغ سفارش برای ارسال با پیک {formatToman(settings.courierMinOrder)} است؛ برای سفارش‌های کمتر، دریافت حضوری از فروشگاه در دسترس است.</P>}
          {enabled.PICKUP && <P>دریافت حضوری از فروشگاه هزینه‌ی ارسال ندارد.</P>}
        </Section>
      )}

      {settings.note && (
        <Section title="توضیحات">
          <P>{settings.note}</P>
        </Section>
      )}
    </InfoPage>
  );
}
