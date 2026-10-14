"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { FaMinus, FaPercent, FaPlus, FaRegTrashAlt, FaTimes } from "react-icons/fa";
import LazyImage from "@/components/LazyImage";
import { useStoreStatus } from "@/components/providers/StoreStatusProvider";
import { useCartQty } from "@/components/cart/useCart";
import { addToCart, removeFromCart, setQty } from "@/lib/cart-store";
import { formatNumber } from "@/lib/format";
import { formatUnitAmount, maxQuantityFor } from "@/lib/product-constants";

/** دکمه‌ی تمام‌عرض «افزودن به سبد» پایین مودال؛ بعد از افزودن تبدیل می‌شه به شمارنده */
function ModalCartAction({ product }) {
  const qty = useCartQty(product.id);
  const max = maxQuantityFor(product.stock);
  const { guard } = useStoreStatus();

  async function handleAdd(next) {
    if (!(await guard())) return;
    next();
  }

  if (max <= 0) {
    return (
      <div className="flex h-12 w-full items-center justify-center rounded-2xl bg-slate-100 text-sm font-bold text-slate-500">
        ناموجود
      </div>
    );
  }

  if (qty === 0) {
    return (
      <button
        type="button"
        onClick={() => handleAdd(() => addToCart(product, 1))}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-b from-green-600 to-green-700 text-sm font-bold text-white shadow-brand transition hover:from-green-700 hover:to-green-800 active:scale-[0.98] focus-visible:ring-4 focus-visible:ring-green-600/20 focus-visible:outline-none"
      >
        <FaPlus size={12} />
        افزودن به سبد
      </button>
    );
  }

  const atMax = qty >= max;

  return (
    <div
      role="group"
      aria-label={`تعداد ${product.name} در سبد`}
      className="flex h-12 w-full items-center justify-between rounded-2xl bg-green-50 px-1.5 ring-1 ring-green-700/25"
    >
      <button
        type="button"
        onClick={() => handleAdd(() => setQty(product.id, qty + 1))}
        disabled={atMax}
        aria-label="افزایش تعداد"
        title={atMax ? "به حداکثر موجودی رسیدی" : undefined}
        className="flex h-9 w-12 items-center justify-center rounded-xl bg-green-700 text-white hover:bg-green-800 disabled:bg-slate-200 disabled:text-slate-400"
      >
        <FaPlus size={12} />
      </button>

      <span aria-live="polite" className="text-base font-extrabold text-slate-800">
        {formatNumber(qty)}
        <span className="ms-1 text-xs font-medium text-slate-500">در سبد شما</span>
      </span>

      <button
        type="button"
        onClick={() => (qty === 1 ? removeFromCart(product.id) : setQty(product.id, qty - 1))}
        aria-label={qty === 1 ? "حذف از سبد" : "کاهش تعداد"}
        className="flex h-9 w-12 items-center justify-center rounded-xl text-green-700 hover:bg-green-100"
      >
        {qty === 1 ? <FaRegTrashAlt size={13} className="text-rose-500" /> : <FaMinus size={12} />}
      </button>
    </div>
  );
}

/**
 * مودال جزئیات محصول — روی موبایل از پایین باز می‌شه (bottom sheet)، روی دسکتاپ وسط صفحه.
 * فقط «یک» تصویر داره (بدون اسلایدر).
 */
export default function ProductDetailModal({ product, open, onOpenChange }) {
  const hasDiscount = product.discountPercent > 0;
  const soldOut = product.stock <= 0;
  const lowStock = !soldOut && product.stock <= 5;
  const unitText = formatUnitAmount(product.amount, product.unit);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />

        <DialogPrimitive.Content
          dir="rtl"
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-3xl bg-white font-sans shadow-pop outline-none data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100%-2rem)] sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95"
        >
          {/* هدر: عنوان سمت راست، دکمه‌ی بستن سمت چپ */}
          <div className="flex items-center justify-between px-5 pb-2 pt-5">
            <DialogPrimitive.Title className="text-sm font-bold text-slate-800">جزئیات محصول</DialogPrimitive.Title>
            <DialogPrimitive.Close className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:ring-4 focus-visible:ring-green-600/20 focus-visible:outline-none">
              <FaTimes size={15} />
              <span className="sr-only">بستن</span>
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Description className="sr-only">
            اطلاعات و قیمت {product.name}
          </DialogPrimitive.Description>

          {/* بدنه‌ی قابل اسکرول */}
          <div className="flex-1 overflow-y-auto px-5 pb-4">
            {/* تصویر (فقط یکی) */}
            <div className="relative mx-auto mt-2 aspect-square w-full max-w-64">
              <LazyImage
                src={product.imageUrl || ""}
                alt={`${product.name} ${unitText}`}
                className={`h-full w-full rounded-2xl ${soldOut ? "opacity-50 grayscale" : ""}`}
              />
            </div>

            {/* چیپ‌ها */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {product.category?.name && (
                <span className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-600">
                  {product.category.name}
                </span>
              )}
              {product.brand?.name && (
                <span className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-600">
                  {product.brand.name}
                </span>
              )}
              {hasDiscount && !soldOut && (
                <span className="flex items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-600">
                  <FaPercent size={10} />
                  شگفت‌انگیز
                </span>
              )}
            </div>

            {/* نام و واحد */}
            <h2 className="mt-4 text-[15px] font-bold leading-7 text-slate-800">
              {product.name}
              <span className="ms-1.5 text-xs font-medium text-slate-500">({unitText})</span>
            </h2>

            {lowStock && (
              <p className="mt-1 text-xs font-medium text-rose-500">تنها {formatNumber(product.stock)} عدد در انبار</p>
            )}

            {product.description?.trim() && (
              <p className="mt-3 line-clamp-5 whitespace-pre-line text-xs leading-7 text-slate-500">
                {product.description}
              </p>
            )}

            {/* قیمت: سمت چپ (در RTL با justify-end پایان خط) */}
            <div className="mt-5 flex flex-col items-end gap-1">
              <div className="flex items-center gap-2">
                {hasDiscount && !soldOut && (
                  <span className="rounded-md bg-linear-to-b from-orange-400 to-orange-600 px-1.5 py-0.5 text-xs font-bold text-white">
                    ٪{formatNumber(product.discountPercent)}
                  </span>
                )}
                <span className={`text-xl font-extrabold ${soldOut ? "text-slate-400" : "text-slate-800"}`}>
                  {formatNumber(product.finalPrice)}
                  <span className="ms-1 text-[11px] font-medium text-slate-500">تومان</span>
                </span>
              </div>
              {hasDiscount && <del className="text-xs text-slate-400">{formatNumber(product.price)}</del>}
            </div>
          </div>

          {/* دکمه‌ی ثابت پایین */}
          <div className="border-t border-slate-100 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            <ModalCartAction product={product} />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
