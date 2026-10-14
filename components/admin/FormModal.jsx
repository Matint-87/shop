"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const SIZES = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
};

/**
 * مودال مشترک فرم‌های افزودن/ویرایش پنل مدیریت.
 * - open: باز یا بسته بودن
 * - onClose: بستن (وقتی busy باشه نادیده گرفته می‌شه تا وسط ذخیره بسته نشه)
 * - کلیک بیرون از مودال بسته نمی‌کنه (که اطلاعات فرم یهو از بین نره)؛ ESC و دکمه‌ی ✕ و «انصراف» می‌بندن
 */
export default function FormModal({ open, onClose, title, description, size = "md", busy = false, className, children }) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) onClose?.();
      }}
    >
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        className={cn("gap-5 p-5 sm:p-6", SIZES[size] ?? SIZES.md, className)}
      >
        <DialogHeader className="pe-8">
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : <DialogDescription className="sr-only">{title}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

/**
 * مقدار آخرین «غیر null» رو نگه می‌داره؛ برای این‌که موقع انیمیشن بسته‌شدن مودال
 * (وقتی state فرم null شده) محتوای فرم یهو خالی نشه.
 */
export function useRetained(value) {
  const [kept, setKept] = useState(value);
  if (value != null && value !== kept) setKept(value);
  return value ?? kept;
}
