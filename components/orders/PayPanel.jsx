"use client";

import { useRef, useState } from "react";
import { FaWallet } from "react-icons/fa";
import { Spinner } from "@/components/ui/form";
import { api } from "@/lib/api-client";
import { formatToman } from "@/lib/format";
import { notify } from "@/lib/toast";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * پرداخت یک سفارش از «اعتبار کیف پول».
 * پرداخت آنلاین (درگاه) نداریم: اگه موجودی کیف پول کمتر از مبلغ سفارش باشه، همون مقدار کم می‌شه
 * و باقی‌مانده هنگام تحویل (حضوری یا درب منزل) دریافت می‌شه.
 * props: order {code, payment:{remaining}}, walletBalance, onPaid(), compact
 */
export default function PayPanel({ order, walletBalance = 0, onPaid, compact = false }) {
  const remaining = order.payment?.remaining ?? order.payable;
  const [busy, setBusy] = useState(false);
  const paying = useRef(false);

  const walletPart = Math.min(walletBalance, remaining);
  const leftover = remaining - walletPart;

  async function pay() {
    if (paying.current || walletPart <= 0) return;
    paying.current = true;
    setBusy(true);
    try {
      const data = await api("POST", `/api/orders/${order.code}/pay`, { useWallet: true });
      notify.success(
        data.remaining > 0
          ? `${formatToman(data.walletPaid)} از کیف پول کم شد. ${formatToman(data.remaining)} هنگام تحویل پرداخت می‌شود.`
          : "پرداخت با موفقیت انجام شد.",
      );
      onPaid?.(data);
    } catch (err) {
      notify.error(err.message);
    }
    paying.current = false;
    setBusy(false);
  }

  return (
    <div className={`rounded-2xl border border-green-200 bg-green-50/40 text-start ${compact ? "p-3" : "p-4"}`}>
      <p className="mb-2 text-xs font-bold text-slate-800">پرداخت از کیف پول — مانده‌ی سفارش: {formatToman(remaining)}</p>

      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-xs">
        <FaWallet className="mt-0.5 shrink-0 text-green-700" size={14} />
        <span className="min-w-0 flex-1 leading-6">
          <span className="block font-bold text-slate-800">اعتبار کیف پول: {formatToman(walletBalance)}</span>
          <span className="block text-slate-500">
            {leftover > 0
              ? `${formatToman(leftover)} باقی‌مانده را هنگام تحویل (حضوری یا درب منزل) پرداخت می‌کنید.`
              : "کل مبلغ سفارش از اعتبار کیف پول پرداخت می‌شود."}
          </span>
        </span>
      </div>

      <button
        type="button"
        onClick={pay}
        disabled={busy || walletPart <= 0}
        className={cn(buttonVariants({ size: "default" }), "mt-3 flex w-full")}
      >
        {busy && <Spinner />}
        {`پرداخت ${formatToman(walletPart)} از کیف پول`}
      </button>
    </div>
  );
}
