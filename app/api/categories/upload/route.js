// آپلود آیکن دسته‌بندی (فقط ادمین): فقط ذخیره می‌کنه و آدرس رو برمی‌گردونه؛ ثبت/ویرایش دسته با imageUrl از همین آدرس انجام می‌شه.
import { handler, ok } from "@/lib/api";
import { requireApiAdmin } from "@/lib/dal";
import { rateLimit } from "@/lib/rate-limit";
import { readImageUpload, saveImage } from "@/lib/storage";

export const POST = handler(async (request) => {
  const admin = await requireApiAdmin();
  await rateLimit(`upload:${admin.id}`, 60, 600, "تعداد آپلودها زیاد بوده؛ کمی بعد تلاش کنید");

  const file = await readImageUpload(request, { field: "image" });
  const imageUrl = await saveImage({ folder: "categories", file });
  return ok({ imageUrl }, { status: 201 });
});
