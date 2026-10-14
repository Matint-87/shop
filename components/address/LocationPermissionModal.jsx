"use client";

import { FaCrosshairs, FaLock, FaMapMarkedAlt } from "react-icons/fa";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// ترتیب واقعی اتفاق‌هاست؛ برای همین شماره‌دار نشون داده می‌شه
const STEPS = [
  "روی «ادامه» بزنید.",
  "مرورگر یک‌بار از شما اجازه می‌خواهد؛ گزینه‌ی «Allow / اجازه دادن» را انتخاب کنید.",
  "نقشه روی محل فعلی شما باز می‌شود و می‌توانید پین را دقیق‌تر بگذارید.",
];

/**
 * مودال توضیحِ «دسترسی به موقعیت مکانی»؛ هر جا که قراره آدرس بگیریم قبل از نقشه نشون داده می‌شه.
 *
 * چرا بعد از این مودال، پنجره‌ی خودِ مرورگر هم میاد؟
 *  اجازه‌ی موقعیت مکانی فقط و فقط با پنجره‌ی خودِ مرورگر داده می‌شه و هیچ سایتی نمی‌تونه از اون رد بشه؛
 *  این مودال «پیش‌پرسش» حساب می‌شه: دلیل رو توضیح می‌ده و کاربر می‌دونه بعدش چی می‌بینه.
 *  مزیت مهمش: اگه کاربر اینجا «نه» بزنه، پنجره‌ی مرورگر اصلاً نشون داده نمی‌شه و سایت توی مرورگر «مسدود» نمی‌شه.
 *
 * تأیید → onAccept | «نه» یا Escape → onDecline. کلیک بیرون از مودال عمداً بسته‌ش نمی‌کنه تا اشتباهی رد نشه.
 * (z-index دیالوگ‌ها از هدر چسبون سایت بالاتره؛ نقشه هم stacking context جدا داره و دیگه روی مودال نمی‌افته.)
 */
export default function LocationPermissionModal({ open, onAccept, onDecline }) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onDecline?.()}>
      <DialogContent
        showClose={false}
        onInteractOutside={(e) => e.preventDefault()}
        className={[
          "flex max-h-[90dvh] max-w-md flex-col gap-0 overflow-hidden p-0",
          // موبایل: bottom-sheet چسبیده به پایین
          "max-sm:bottom-0 max-sm:left-0 max-sm:top-auto max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none max-sm:data-[state=open]:slide-in-from-bottom-10",
        ].join(" ")}
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="flex flex-col items-center bg-linear-to-b from-green-50 to-transparent px-6 pb-2 pt-8">
            <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-linear-to-b from-green-500 to-green-700 text-white shadow-brand">
              <FaMapMarkedAlt size={26} />
            </span>
            <DialogHeader className="mt-4 items-center text-center">
              <DialogTitle className="text-lg">محل تحویل را دقیق پیدا کنیم؟</DialogTitle>
              <DialogDescription className="max-w-sm text-center text-[13px] leading-7">
                با اجازه‌ی شما، نقشه روی محل فعلی‌تان باز می‌شود تا نشانی را سریع‌تر و دقیق‌تر ثبت کنید.
              </DialogDescription>
            </DialogHeader>
          </div>

          <ol className="space-y-3 px-6 py-4">
            {STEPS.map((text, i) => (
              <li key={text} className="flex items-start gap-3 text-xs leading-6 text-slate-600">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600 text-[11px] font-bold text-white">
                  {["۱", "۲", "۳"][i]}
                </span>
                <span>{text}</span>
              </li>
            ))}
          </ol>

          <p className="mx-6 mb-4 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-[11px] leading-5 text-slate-500">
            <FaLock size={11} className="mt-1 shrink-0" aria-hidden="true" />
            موقعیت لحظه‌ای شما ذخیره نمی‌شود؛ فقط نقطه‌ای که روی نقشه تأیید می‌کنید. هر زمان بخواهید از تنظیمات مرورگر قابل لغو است.
          </p>
        </div>

        <DialogFooter className="shrink-0 flex-col gap-2.5 border-t border-slate-100 bg-slate-50/60 px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 ">
          <Button type="button" size="lg" onClick={onAccept} className="w-full">
            <FaCrosshairs size={14} />
            ادامه
          </Button>
          <Button type="button" size="lg" variant="outline" onClick={onDecline} className="w-full whitespace-normal">
            خودم روی نقشه انتخاب می‌کنم
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
