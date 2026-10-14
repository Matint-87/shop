"use client";

import { useState } from "react";
import Link from "next/link";
import LazyImage from "@/components/LazyImage";
import AddToCartButton from "@/components/cart/AddToCartButton";
import ProductDetailModal from "@/components/ProductDetailModal";
import { formatNumber } from "@/lib/format";
import { formatUnitAmount } from "@/lib/product-constants";

const LOW_STOCK_THRESHOLD = 5;

/**
 * کارت محصول — توی گرید صفحه‌ی محصولات، اسلایدرها و صفحه‌ی اصلی.
 * - اندازه‌ی کارت و عکس همه‌جا یکسانه (عکس مربعی و تمام‌عرض، چسبیده به لبه‌های کارت)
 * - کلیک روی «کل کارت» مودال جزئیات رو باز می‌کنه (دکمه‌ی سبد خرید جداست و مودال باز نمی‌کنه)
 * - پراپ compact فقط برای سازگاری با کدهای قبلی مونده و دیگه اثری نداره
 */
// eslint-disable-next-line no-unused-vars
export default function ProductCard({ product, compact = false }) {
  const [open, setOpen] = useState(false);
  const hasDiscount = product.discountPercent > 0;
  const soldOut = product.stock <= 0;
  const lowStock = !soldOut && product.stock <= LOW_STOCK_THRESHOLD;

  // کلیک ساده → مودال؛ کلیک با Ctrl/Cmd/Shift یا کلیک وسط → لینک عادی صفحه‌ی محصول (برای سئو لینک سر جاش می‌مونه)
  function openModal(e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    setOpen(true);
  }

  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-soft transition-shadow hover:shadow-pop">
      {/* عکس: مربعی، تمام‌عرض و بدون فاصله از لبه‌های کارت */}
      <div className="relative">
        <LazyImage
          src={product.imageUrl || ""}
          alt={product.name}
          className={`aspect-square w-full bg-slate-50 ${soldOut ? "opacity-50 grayscale" : ""}`}
        />

        {hasDiscount && !soldOut && (
          <span className="absolute start-2 top-2 z-10 rounded-full bg-linear-to-b from-orange-400 to-orange-600 px-2 py-0.5 text-xs font-bold text-white shadow-sm">
            ٪{formatNumber(product.discountPercent)}
          </span>
        )}

        {lowStock && (
          <span className="absolute bottom-2 start-2 z-10 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-rose-500 shadow-sm">
            تنها {formatNumber(product.stock)} عدد
          </span>
        )}

        {/* بالاتر از لایه‌ی کلیک کارت (z-20) تا کلیکش مودال باز نکنه */}
        <AddToCartButton product={product} className="absolute bottom-2 end-2 z-20" />
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 min-h-10 text-xs font-medium leading-5 text-slate-700">
          {/* لینک کش‌دار (stretched link): after:inset-0 کل کارت رو قابل‌کلیک می‌کنه */}
          <Link
            href={`/products/${product.id}`}
            onClick={openModal}
            className="after:absolute after:inset-0 after:z-10 after:content-[''] hover:text-green-700 focus-visible:outline-none focus-visible:after:ring-4 focus-visible:after:ring-green-600/30 after:rounded-2xl"
          >
            {product.name}
          </Link>
        </h3>
        <p className="text-xs text-slate-400">{formatUnitAmount(product.amount, product.unit)}</p>

        {/* ارتفاع ثابت (حتی بدون تخفیف) تا همه‌ی کارت‌ها هم‌قد بمونن */}
        <div className="mt-auto flex min-h-11 flex-col justify-end pt-1">
          <del className={`block h-4 text-xs text-slate-400 ${hasDiscount ? "" : "invisible"}`}>
            {formatNumber(product.price)}
          </del>
          <span className={`text-[15px] font-extrabold ${soldOut ? "text-slate-400" : "text-slate-800"}`}>
            {formatNumber(product.finalPrice)}
            <span className="ms-1 text-[11px] font-medium text-slate-500">تومان</span>
          </span>
        </div>
      </div>

      {/* فقط وقتی باز شد ساخته می‌شه تا روی گریدهای بزرگ سنگین نشه */}
      {open && <ProductDetailModal product={product} open={open} onOpenChange={setOpen} />}
    </article>
  );
}
