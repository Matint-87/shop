"use client";

import { Field } from "@/components/ui/form";
import JalaliDatePicker from "@/components/ui/JalaliDatePicker";
import { currentJalaliYear, jalaliToIso } from "@/lib/jalali";

const MIN_AGE = 12;
const MAX_AGE = 100;

/**
 * تاریخ تولد با تقویم شمسی. value: تاریخ ISO میلادی ("1990-05-14") یا ""؛ onChange هم با ISO یا "" صدا زده می‌شه.
 * سال‌ها از ۱۲ تا ۱۰۰ سال پیش محدود شدن؛ تقویم هم برای شروع روی ~۳۰ سال پیش باز می‌شه (نه امسال).
 */
export default function JalaliDateField({ value, onChange, error }) {
  const thisYear = currentJalaliYear();
  const maxKey = jalaliToIso(thisYear - MIN_AGE, 12, 29) ?? "";
  const minKey = jalaliToIso(thisYear - MAX_AGE, 1, 1) ?? "";
  const defaultViewKey = jalaliToIso(thisYear - 30, 1, 1) ?? "";

  return (
    <Field label="تاریخ تولد" htmlFor="birthDate" error={error}>
      <JalaliDatePicker
        id="birthDate"
        label="تاریخ تولد"
        placeholder="انتخاب تاریخ تولد"
        value={value}
        onChange={onChange}
        minKey={minKey}
        maxKey={maxKey}
        defaultViewKey={defaultViewKey}
        error={error}
      />
    </Field>
  );
}
