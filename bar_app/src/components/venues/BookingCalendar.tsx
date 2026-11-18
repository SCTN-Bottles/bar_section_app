"use client";

import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";


import ActionButton from "@/components/ui/ActionButton";
import { useState } from "react";

import { formatBookingTime } from "@/lib/booking-time";

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
      className="sctn-panel mb-6 w-full max-w-lg p-4 sm:p-5"
      aria-labelledby="booking-calendar-title"
    >
      <HStack gap={2} vAlign="stretch" wrap="wrap" className="items-start justify-between">
        <VStack>
          <Text as="p" type="supporting" color="secondary" className="text-sm text-neutral-500">Reservation date</Text>
          <Heading level={2} id="booking-calendar-title" className="mt-1 text-xl font-semibold">
            Choose your night
          </Heading>
        </VStack>

        <VStack className="sctn-inset px-3 py-2 text-sm">
          <Text as="span" type="inherit" color="inherit" className="text-neutral-500">Time </Text>
          <Text as="span" type="inherit" color="inherit" className="font-semibold">{formatBookingTime(placeholderTime)}</Text>
        </VStack>
      </HStack>

      <HStack vAlign="stretch" className="mt-4 items-center justify-between border-t border-neutral-300 pt-3">
        <ActionButton
          type="button"
          onClick={() => changeMonth(-1)}
          disabled={isCurrentMonth}
          aria-label="Show previous month"
          variant="secondary"
          label="←"
        />
        <Text as="p" type="inherit" color="inherit" className="font-semibold">{monthLabel}</Text>
        <ActionButton
          type="button"
          onClick={() => changeMonth(1)}
          aria-label="Show next month"
          variant="secondary"
          label="→"
        />
      </HStack>

      <Grid columns={7} gap={1.5} className="mt-3 text-center text-xs">
        {weekdayLabels.map((day) => (
          <Text as="span" type="inherit" color="inherit" key={day} className="pb-2 font-medium text-neutral-500">
            {day}
          </Text>
        ))}
        {Array.from({ length: leadingDays }).map((_, index) => (
          <Text as="span" type="inherit" color="inherit" key={`empty-${index}`} aria-hidden="true">{""}</Text>
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
            <ActionButton
              key={dateKey}
              type="button"
              disabled={!available}
              onClick={() => onChange(dateKey)}
              aria-pressed={selected}
              variant={selected ? "primary" : "secondary"}
              label={String(date.getDate())}
              className="calendar-day"
            />
          );
        })}
      </Grid>
    </section>
  );
}
