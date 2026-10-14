-- وزن و حجم هر واحد فروش محصول (برای محاسبه‌ی هزینه‌ی ارسال بر اساس وزن/حجم)
ALTER TABLE "products" ADD COLUMN "weight_kg" DOUBLE PRECISION;
ALTER TABLE "products" ADD COLUMN "volume_liters" DOUBLE PRECISION;
