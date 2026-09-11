"use client";

import { useState } from "react";

type BookingCalendarProps = {
  value: string | null;
  onChange: (date: string) => void;
  availableWeekdays: number[];
  placeholderTime: string;
};

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function fromDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function todayAtMidnight() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getFirstAvailableDate(availableWeekdays: number[]) {
  const date = todayAtMidnight();

  while (!availableWeekdays.includes(date.getDay())) {
    date.setDate(date.getDate() + 1);
  }

  return toDateKey(date);
}

export default function BookingCalendar({
  value,
  onChange,
  availableWeekdays,
  placeholderTime,
}: BookingCalendarProps) {
  const [displayMonth, setDisplayMonth] = useState(() => {
    const selectedDate = value ? fromDateKey(value) : todayAtMidnight();
    return new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  });
  const today = todayAtMidnight();
  const daysInMonth = new Date(
    displayMonth.getFullYear(),
    displayMonth.getMonth() + 1,
    0,
  ).getDate();
  const leadingDays = displayMonth.getDay();
  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(displayMonth);

  function changeMonth(offset: number) {
    setDisplayMonth(
      (month) => new Date(month.getFullYear(), month.getMonth() + offset, 1),
    );
  }

  const isCurrentMonth =
    displayMonth.getFullYear() === today.getFullYear() &&
    displayMonth.getMonth() === today.getMonth();

  return (
    <section
      className="mb-6 w-full max-w-xl rounded-xl border border-neutral-300 bg-neutral-50 p-4"
      aria-labelledby="booking-calendar-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm text-neutral-500">Reservation date</p>
          <h2 id="booking-calendar-title" className="mt-1 text-xl font-semibold">
            Choose your night
          </h2>
        </div>

        <div className="rounded-md border border-primary bg-primary px-4 py-2 text-sm text-on-primary">
          <span className="text-on-primary">Time </span>
          <span className="font-semibold">{placeholderTime}</span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          disabled={isCurrentMonth}
          className="rounded-md border border-neutral-300 px-3 py-1 text-sm hover:border-primary disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Show previous month"
        >
          ←
        </button>
        <p className="font-semibold">{monthLabel}</p>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          className="rounded-md border border-neutral-300 px-3 py-1 text-sm hover:border-primary"
          aria-label="Show next month"
        >
          →
        </button>
      </div>

      <div className="mx-auto mt-3 grid w-fit grid-cols-7 gap-1 text-center text-xs text-neutral-500">
        {weekdayLabels.map((day) => (
          <span key={day} className="font-medium">
            {day}
          </span>
        ))}
        {Array.from({ length: leadingDays }).map((_, index) => (
          <span key={`empty-${index}`} aria-hidden="true" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, index) => {
          const date = new Date(
            displayMonth.getFullYear(),
            displayMonth.getMonth(),
            index + 1,
          );
          const dateKey = toDateKey(date);
          const available =
            date >= today && availableWeekdays.includes(date.getDay());
          const selected = dateKey === value;

          return (
            <button
              key={dateKey}
              type="button"
              disabled={!available}
              onClick={() => onChange(dateKey)}
              aria-pressed={selected}
              className={`min-h-9 min-w-9 aspect-square rounded-md border text-xs font-medium ${
                selected
                  ? "border-primary bg-primary text-on-primary hover:bg-accent"
                  : available
                    ? "border-neutral-300 bg-neutral-100 hover:border-primary"
                    : "border-transparent text-neutral-500 opacity-40"
              }`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-sm text-neutral-500">
        Reservations are currently offered Tuesday, Thursday, and Friday through Sunday.
      </p>
    </section>
  );
}
