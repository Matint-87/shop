-- کارت‌خوان به‌عنوان روش دریافت
ALTER TYPE "PaymentMethod" ADD VALUE 'POS';

-- نوع محل دریافت وجه: صندوق / بانک / کارت‌خوان
CREATE TYPE "PaymentAccountKind" AS ENUM ('CASH_BOX', 'BANK', 'CARD_READER');

-- CreateTable
CREATE TABLE "payment_accounts" (
    "id" UUID NOT NULL,
    "kind" "PaymentAccountKind" NOT NULL,
    "name" TEXT NOT NULL,
    "bank_name" TEXT,
    "card_number" TEXT,
    "holder_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_accounts_is_active_sort_order_idx" ON "payment_accounts"("is_active", "sort_order");

-- تراکنش‌ها: محل دریافت وجه (+ اسنپ‌شات نام)
ALTER TABLE "transactions" ADD COLUMN "account_id" UUID;
ALTER TABLE "transactions" ADD COLUMN "account_name" TEXT;

-- CreateIndex
CREATE INDEX "transactions_account_id_idx" ON "transactions"("account_id");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "payment_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
