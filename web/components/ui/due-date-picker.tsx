"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const addDays = (base: Date, days: number) => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
};

const PRESETS: { label: string; days: number }[] = [
  { label: "Today", days: 0 },
  { label: "Net 7", days: 7 },
  { label: "Net 30", days: 30 },
  { label: "Net 60", days: 60 },
  { label: "Net 90", days: 90 },
];

const dayClasses = {
  months: "relative",
  month: "w-full",
  month_caption: "mb-1 flex h-9 items-center justify-center text-sm font-medium text-paper",
  caption_label: "text-sm",
  nav: "absolute top-1 z-10 flex w-full justify-between px-1",
  button_previous: "grid size-7 place-items-center rounded border border-rule text-paper-dim hover:text-paper",
  button_next: "grid size-7 place-items-center rounded border border-rule text-paper-dim hover:text-paper",
  weekdays: "grid grid-cols-7 text-center text-[10px] uppercase tracking-wide text-paper-faint",
  weekday: "py-1",
  week: "grid grid-cols-7",
  day: "text-center",
  day_button:
    "relative grid size-9 cursor-pointer place-items-center rounded text-sm text-paper transition hover:bg-ink-3 " +
    "focus:outline-none focus-visible:ring-1 focus-visible:ring-gold " +
    "group-data-[selected]:bg-gold group-data-[selected]:font-semibold group-data-[selected]:text-ink " +
    "group-data-[disabled]:cursor-not-allowed group-data-[disabled]:opacity-30 group-data-[disabled]:hover:bg-transparent",
  today: "after:absolute after:bottom-1 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-gold",
  outside: "text-paper-faint/40",
  hidden: "invisible",
};

export function DueDatePicker({
  value,
  onChange,
}: {
  value: Date | undefined;
  onChange: (d: Date | undefined) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [month, setMonth] = React.useState<Date>(value ?? startOfToday());
  const wrap = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const label = value
    ? value.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    : "Select due date";

  return (
    <div className="relative" ref={wrap}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input flex items-center justify-between text-left"
      >
        <span className={value ? "text-paper" : "text-paper-faint"}>{label}</span>
        <CalendarDays className="h-4 w-4 text-paper-faint" />
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-2 w-[19rem] border border-rule bg-ink-2 p-3 shadow-xl">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  const d = addDays(startOfToday(), p.days);
                  onChange(d);
                  setMonth(d);
                  setOpen(false);
                }}
                className="border border-rule px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-paper-dim transition hover:border-gold/50 hover:text-paper"
              >
                {p.label}
              </button>
            ))}
          </div>

          <DayPicker
            mode="single"
            month={month}
            onMonthChange={setMonth}
            selected={value}
            onSelect={(d) => {
              onChange(d);
              if (d) setOpen(false);
            }}
            disabled={{ before: startOfToday() }}
            showOutsideDays
            classNames={dayClasses}
            components={{
              Chevron: ({ orientation }) =>
                orientation === "left" ? <ChevronLeft size={16} /> : <ChevronRight size={16} />,
            }}
            className={cn("w-full")}
          />
        </div>
      )}
    </div>
  );
}
