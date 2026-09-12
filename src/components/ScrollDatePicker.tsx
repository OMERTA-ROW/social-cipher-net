import { useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Scrollable (wheel-style) date picker.
 * Three snap-scrolling columns: month, day, year. Works with touch and mouse wheel.
 * Value format: YYYY-MM-DD (empty string when incomplete).
 */
export interface ScrollDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  /** Oldest selectable year. Default 1900 */
  minYear?: number;
  /** Newest selectable year. Default current year */
  maxYear?: number;
  className?: string;
  id?: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const ITEM_HEIGHT = 36;

const pad = (n: number) => String(n).padStart(2, "0");

const Column = ({
  items,
  selectedIndex,
  onSelect,
  label,
}: {
  items: { key: string; label: string }[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  label: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const settle = useRef<number | null>(null);

  // Keep the list aligned with the selected value when it changes externally.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = selectedIndex * ITEM_HEIGHT;
    if (Math.abs(el.scrollTop - target) > 2) {
      el.scrollTo({ top: target, behavior: "smooth" });
    }
  }, [selectedIndex]);

  const handleScroll = () => {
    const el = ref.current;
    if (!el) return;
    if (settle.current) window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      const index = Math.max(
        0,
        Math.min(items.length - 1, Math.round(el.scrollTop / ITEM_HEIGHT)),
      );
      if (index !== selectedIndex) onSelect(index);
    }, 90);
  };

  return (
    <div
      ref={ref}
      role="listbox"
      aria-label={label}
      tabIndex={0}
      onScroll={handleScroll}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          onSelect(Math.min(items.length - 1, selectedIndex + 1));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          onSelect(Math.max(0, selectedIndex - 1));
        }
      }}
      className="relative h-[108px] flex-1 overflow-y-auto snap-y snap-mandatory scrollbar-none outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-md"
      style={{ scrollbarWidth: "none" }}
    >
      <div style={{ height: ITEM_HEIGHT }} aria-hidden />
      {items.map((item, i) => (
        <button
          key={item.key}
          type="button"
          role="option"
          aria-selected={i === selectedIndex}
          onClick={() => onSelect(i)}
          style={{ height: ITEM_HEIGHT }}
          className={cn(
            "w-full snap-center flex items-center justify-center text-sm transition-colors",
            i === selectedIndex
              ? "text-primary font-semibold"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {item.label}
        </button>
      ))}
      <div style={{ height: ITEM_HEIGHT }} aria-hidden />
    </div>
  );
};

const ScrollDatePicker = ({
  value,
  onChange,
  minYear = 1900,
  maxYear = new Date().getFullYear(),
  className,
  id,
}: ScrollDatePickerProps) => {
  const parsed = useMemo(() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    const fallbackYear = maxYear - 18;
    if (!m) return { year: fallbackYear, month: 1, day: 1 };
    return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  }, [value, maxYear]);

  const years = useMemo(() => {
    const list: { key: string; label: string }[] = [];
    for (let y = maxYear; y >= minYear; y--) list.push({ key: String(y), label: String(y) });
    return list;
  }, [minYear, maxYear]);

  const daysInMonth = new Date(parsed.year, parsed.month, 0).getDate();
  const days = useMemo(
    () =>
      Array.from({ length: daysInMonth }, (_, i) => ({
        key: String(i + 1),
        label: String(i + 1),
      })),
    [daysInMonth],
  );
  const months = useMemo(
    () => MONTHS.map((m, i) => ({ key: String(i + 1), label: m })),
    [],
  );

  // Record the date shown on first render so the highlighted value is real.
  useEffect(() => {
    if (!value) {
      onChange(`${parsed.year}-${pad(parsed.month)}-${pad(parsed.day)}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const emit = (year: number, month: number, day: number) => {
    const maxDay = new Date(year, month, 0).getDate();
    onChange(`${year}-${pad(month)}-${pad(Math.min(day, maxDay))}`);
  };

  return (
    <div
      id={id}
      className={cn(
        "relative rounded-md border border-primary/30 bg-background/50 px-2",
        className,
      )}
    >
      {/* Selection band */}
      <div
        className="pointer-events-none absolute inset-x-2 top-1/2 -translate-y-1/2 rounded-md border border-primary/40 bg-primary/5"
        style={{ height: ITEM_HEIGHT }}
        aria-hidden
      />
      <div className="relative flex gap-1">
        <Column
          label="Month"
          items={months}
          selectedIndex={parsed.month - 1}
          onSelect={(i) => emit(parsed.year, i + 1, parsed.day)}
        />
        <Column
          label="Day"
          items={days}
          selectedIndex={Math.min(parsed.day, daysInMonth) - 1}
          onSelect={(i) => emit(parsed.year, parsed.month, i + 1)}
        />
        <Column
          label="Year"
          items={years}
          selectedIndex={Math.max(0, maxYear - parsed.year)}
          onSelect={(i) => emit(maxYear - i, parsed.month, parsed.day)}
        />
      </div>
    </div>
  );
};

export default ScrollDatePicker;
