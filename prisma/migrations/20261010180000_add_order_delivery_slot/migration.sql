-- بازه‌ی زمانی تحویل/دریافت سفارش که مشتری موقع ثبت سفارش انتخاب می‌کنه (سفارش‌های قبلی خالی می‌مونن)
ALTER TABLE "orders" ADD COLUMN "delivery_slot_start" TIMESTAMP(3),
ADD COLUMN "delivery_slot_end" TIMESTAMP(3);

CREATE INDEX "orders_delivery_slot_start_idx" ON "orders"("delivery_slot_start");
