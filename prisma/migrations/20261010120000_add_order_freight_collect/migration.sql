-- پس‌کرایه‌ی پست: هزینه‌ی ارسال رو مشتری موقع تحویل به شرکت پست می‌پردازه
ALTER TABLE "orders" ADD COLUMN "freight_collect" BOOLEAN NOT NULL DEFAULT false;
