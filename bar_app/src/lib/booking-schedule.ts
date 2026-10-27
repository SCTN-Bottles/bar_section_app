import { getSections } from "@/lib/sections";
import { supabase } from "@/lib/supabase";
import type { Section, SectionStatus } from "@/types/venue";

const devDb = supabase.schema("sctn-dev");
export type BookingSlot = "day" | "night";
export type ScheduledSection = Section & {
  date: string;
  slot: BookingSlot;
  time: string;
  saved: boolean;
};

type ScheduleRow = {
  section_id: string;
  reservation_date: string;
  booking_slot: BookingSlot;
  reservation_time: string;
  section_name: string;
  section_description: string;
  guest_count: number;
  status: SectionStatus;
  minimum_spend_amount: number | string;
  deposit_amount: number | string;
};

export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function weekStart(value: string): string {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() - date.getDay());
  return dateKey(date);
}

export function offsetDate(value: string, days: number): string {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

export function scheduleKey(section: Pick<ScheduledSection, "id" | "date" | "slot">): string {
  return `${section.date}:${section.slot}:${section.id}`;
}

export function mergeSchedule(
  sections: Section[], dates: string[], slots: BookingSlot[], time: string, rows: ScheduleRow[],
): ScheduledSection[] {
  const existing = new Map(rows.map((row) => [`${row.reservation_date}:${row.booking_slot}:${row.section_id}`, row]));
  return dates.flatMap((date) => slots.flatMap((slot) => sections.map((section) => {
    const row = existing.get(`${date}:${slot}:${section.id}`);
    return {
      ...section, date, slot, time: row?.reservation_time.slice(0, 5) ?? time.slice(0, 5), saved: Boolean(row),
      name: row?.section_name ?? section.name,
      description: row?.section_description ?? section.description,
      capacity: row?.guest_count ?? section.capacity,
      status: row?.status ?? section.status,
      minimumSpend: Number(row?.minimum_spend_amount ?? section.minimumSpend),
      deposit: Number(row?.deposit_amount ?? section.deposit),
    };
  })));
}

export async function loadBookingSchedule(venueId: string, venueName: string, dates: string[]) {
  // Read defaults directly from sections, avoiding any local reservation status overrides.
  const [sections, venueResult] = await Promise.all([
    getSections(venueName),
    devDb.from("venues").select("booking_slots, booking_start_time").eq("id", venueId).single(),
  ]);
  if (venueResult.error) throw venueResult.error;
  const slots = venueResult.data.booking_slots as BookingSlot[];
  if (!slots.length || slots.some((slot) => slot !== "day" && slot !== "night")) {
    throw new Error("The venue's booking slots are not configured correctly.");
  }
  if (!sections.length) return { sections: [], slots };
  const { data, error } = await devDb.from("bookings")
    .select("section_id, reservation_date, booking_slot, reservation_time, section_name, section_description, guest_count, status, minimum_spend_amount, deposit_amount")
    .eq("record_type", "schedule")
    .in("section_id", sections.map((section) => section.id))
    .in("reservation_date", dates);
  if (error) throw error;
  return {
    sections: mergeSchedule(sections, dates, slots, venueResult.data.booking_start_time, data as ScheduleRow[]),
    slots,
  };
}

export function validateSchedule(sections: ScheduledSection[]): ScheduledSection | undefined {
  return sections.find((section) => !section.name.trim() || !section.description.trim()
    || !Number.isInteger(section.capacity) || section.capacity < 1
    || !Number.isFinite(section.minimumSpend) || section.minimumSpend < 0
    || !Number.isFinite(section.deposit) || section.deposit < 0
    || !/^([01]\d|2[0-3]):[0-5]\d$/.test(section.time)
    || !["available", "sold"].includes(section.status));
}

export async function saveBookingSchedule(sections: ScheduledSection[]) {
  if (!sections.length || validateSchedule(sections)) throw new Error("Check all section details before saving.");
  const { data, error } = await devDb.rpc("save_section_schedule", { p_settings: sections.map((section) => ({
    section_id: section.id,
    reservation_date: section.date,
    booking_slot: section.slot,
    reservation_time: section.time,
    section_name: section.name.trim(),
    section_description: section.description.trim(),
    guest_count: section.capacity,
    status: section.status,
    minimum_spend_amount: section.minimumSpend,
    deposit_amount: section.deposit,
  })) });
  if (error) throw error;
  if (data?.length !== sections.length) throw new Error("Some settings were not saved. Check your venue access and try again.");
}

export async function getScheduleDates(venueId: string, week: string): Promise<string[]> {
  const { data, error } = await devDb.rpc("get_schedule_dates", { p_venue_id: venueId, p_week: week });
  if (error) throw error;
  return (data as { reservation_date: string }[]).map((row) => row.reservation_date);
}

export async function deleteScheduleDay(venueId: string, date: string) {
  const { error } = await devDb.rpc("delete_schedule_day", { p_venue_id: venueId, p_date: date });
  if (error) throw error;
}
