import {
  FaAppleAlt,
  FaBreadSlice,
  FaCarrot,
  FaCheese,
  FaEgg,
  FaExclamationTriangle,
  FaFish,
  FaLemon,
  FaPepperHot,
  FaShoppingBasket,
} from "react-icons/fa";

/*
  صحنه‌ی مشترک صفحه‌های خطا (۴۰۴ و خطای برنامه).
  بدون state و بدون هوک؛ هم توی کامپوننت سروری (not-found) و هم کلاینتی (error) قابل استفاده‌ست.
  همه‌ی انیمیشن‌ها با motion-safe: هستن، یعنی کسی که «کاهش حرکت» رو روشن کرده چیزی تکون‌خوردنی نمی‌بینه.
  رنگ‌ها از پالت سایت (green-* / slate-*) میان، پس تم تاریک و پالت انتخابی ادمین خودکار اعمال می‌شن.
*/

// میوه و خوراکی‌های شناور پس‌زمینه: [آیکن، موقعیت، اندازه، تأخیر انیمیشن]
const FLOATERS = [
  [FaAppleAlt, "left-[8%] top-[14%]", 30, "0s"],
  [FaCarrot, "right-[9%] top-[20%]", 34, "-1.6s"],
  [FaBreadSlice, "left-[14%] bottom-[18%]", 32, "-3.1s"],
  [FaCheese, "right-[13%] bottom-[14%]", 30, "-4.4s"],
  [FaLemon, "left-[3%] top-[48%]", 26, "-2.2s"],
  [FaEgg, "right-[4%] top-[52%]", 24, "-5.3s"],
  [FaFish, "left-[40%] top-[6%]", 26, "-0.8s"],
  [FaPepperHot, "right-[34%] bottom-[6%]", 26, "-3.8s"],
];

function Floaters({ tone }) {
  return (
    <>
      {FLOATERS.map(([Icon, pos, size, delay], i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`pointer-events-none absolute hidden sm:block ${pos} ${tone} opacity-40 motion-safe:animate-float`}
          style={{ animationDelay: delay }}
        >
          <Icon size={size} />
        </span>
      ))}
    </>
  );
}

/**
 * @param {"notfound" | "error"} variant
 * @param {string} title   عنوان اصلی
 * @param {string} description   توضیح کوتاه
 * @param {React.ReactNode} children   دکمه‌ها / فرم جستجو / لینک‌ها
 */
export default function ErrorScene({ variant = "notfound", title, description, children, note }) {
  const isError = variant === "error";
  const blobA = isError ? "bg-red-200/60" : "bg-green-300/50";
  const blobB = isError ? "bg-amber-200/50" : "bg-green-200/70";
  const floaterTone = isError ? "text-red-300" : "text-green-400";

  return (
    <section className="relative isolate flex w-full flex-1 items-center justify-center overflow-hidden px-4 py-12 sm:py-16">
      {/* لکه‌های رنگی نرم که آروم جابه‌جا می‌شن */}
      <span aria-hidden="true" className={`pointer-events-none absolute -left-20 -top-24 -z-10 h-80 w-80 rounded-full blur-3xl motion-safe:animate-blob ${blobA}`} />
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -bottom-28 -right-16 -z-10 h-96 w-96 rounded-full blur-3xl motion-safe:animate-blob ${blobB}`}
        style={{ animationDelay: "-7s" }}
      />
      <Floaters tone={floaterTone} />

      <div className="relative w-full max-w-xl rounded-[2rem] border border-slate-200/70 bg-white/70 px-6 py-10 text-center shadow-pop backdrop-blur-md motion-safe:animate-fade-up sm:px-10">
        {/* بخش تصویری */}
        {isError ? (
          <div className="relative mx-auto mb-7 flex h-32 w-32 items-center justify-center">
            <span aria-hidden="true" className="absolute inset-3 rounded-full bg-red-400/40 motion-safe:animate-ring-out" />
            <span
              aria-hidden="true"
              className="absolute inset-3 rounded-full bg-red-400/40 motion-safe:animate-ring-out"
              style={{ animationDelay: "-1.3s" }}
            />
            <span className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-linear-to-br from-red-500 to-red-700 text-white shadow-[0_8px_20px_-8px_rgb(220_38_38/0.55)] motion-safe:animate-pop-in">
              <FaShoppingBasket size={44} className="origin-bottom motion-safe:animate-wobble" />
              <span className="absolute -bottom-2 -left-2 flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 text-amber-950 ring-4 ring-white">
                <FaExclamationTriangle size={16} />
              </span>
            </span>
          </div>
        ) : (
          <div className="mb-6 flex items-end justify-center gap-1 sm:gap-3" dir="ltr">
            <span className="bg-linear-to-b from-green-500 to-green-800 bg-clip-text text-7xl font-extrabold leading-none text-transparent motion-safe:animate-pop-in sm:text-8xl">
              ۴
            </span>
            {/* به‌جای صفر: سبد خرید که بالا و پایین می‌ره */}
            <span className="relative mx-1 mb-1 flex h-24 w-24 flex-col items-center sm:h-28 sm:w-28">
              <span aria-hidden="true" className="absolute inset-0 m-auto h-20 w-20 rounded-full bg-green-400/40 motion-safe:animate-ring-out sm:h-24 sm:w-24" />
              <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-br from-green-500 to-green-700 text-white shadow-brand motion-safe:animate-bob sm:h-24 sm:w-24">
                <FaShoppingBasket size={40} />
              </span>
              <span aria-hidden="true" className="absolute -bottom-1 h-2.5 w-16 rounded-full bg-slate-900/30 blur-sm motion-safe:animate-shadow-pulse" />
            </span>
            <span
              className="bg-linear-to-b from-green-500 to-green-800 bg-clip-text text-7xl font-extrabold leading-none text-transparent motion-safe:animate-pop-in sm:text-8xl"
              style={{ animationDelay: "0.12s" }}
            >
              ۴
            </span>
          </div>
        )}

        <h1 className="text-xl font-extrabold text-slate-800 motion-safe:animate-fade-up sm:text-2xl" style={{ animationDelay: "0.1s" }}>
          {title}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-500 motion-safe:animate-fade-up" style={{ animationDelay: "0.2s" }}>
          {description}
        </p>

        <div className="motion-safe:animate-fade-up" style={{ animationDelay: "0.3s" }}>
          {children}
        </div>

        {note ? <p className="mt-6 text-xs leading-6 text-slate-400 motion-safe:animate-fade-up" style={{ animationDelay: "0.4s" }}>{note}</p> : null}
      </div>
    </section>
  );
}
