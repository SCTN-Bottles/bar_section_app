import { supabase } from "@/lib/supabase";

export type VendorBooking = {
  id: string;
  section_id: string;
  record_type: "reservation" | "schedule";
  customer_name: string | null;
  customer_email: string | null;
  section_name: string;
  reservation_date: string;
  reservation_time: string;
  booking_slot: string;
  guest_count: number;
  deposit_amount: number;
  minimum_spend_amount: number;
  drink_sign_text: string | null;
  status: string;
  beverages: { name: string; quantity: number }[];
};

export function bookingToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (name: string) => parts.find((item) => item.type === name)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function validBookingDates(start: string, end: string) {
  const valid = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(`${value}T12:00:00Z`))
    && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
  return valid(start) && valid(end) && start >= bookingToday() && start <= end;
}

export function bookingDates(start: string, end: string): string[] {
  if (!validBookingDates(start, end)) return [];
  const dates: string[] = [];
  const date = new Date(`${start}T12:00:00Z`);
  const last = Date.parse(`${end}T12:00:00Z`);
  while (date.getTime() <= last) {
    dates.push(date.toISOString().slice(0, 10));
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return dates;
}

export async function loadVendorBookings(venueId: string, start: string, end: string): Promise<VendorBooking[]> {
  if (!venueId || !validBookingDates(start, end)) throw new Error("Choose a valid start and end date from today onward. The end date must be on or after the start date.");
  const rows: VendorBooking[] = [];
  for (let offset = 0; ; offset += 200) {
    const { data, error } = await supabase.schema("sctn-dev").from("bookings")
      .select("id,section_id,record_type,customer_name,customer_email,section_name,reservation_date,reservation_time,booking_slot,guest_count,deposit_amount,minimum_spend_amount,drink_sign_text,status,beverages,sections!inner(venue_id)")
      .eq("sections.venue_id", venueId)
      .in("record_type", ["reservation", "schedule"])
      .gte("reservation_date", start).lte("reservation_date", end)
      .order("reservation_date").order("reservation_time").order("id")
      .range(offset, offset + 199);
    if (error) throw new Error("Bookings could not be loaded. Please try again.");
    rows.push(...(data ?? []) as VendorBooking[]);
    if (!data || data.length < 200) break;
  }
  const reserved = new Set(rows.filter((row) => row.record_type === "reservation" && ["pending", "confirmed", "completed"].includes(row.status))
    .map((row) => `${row.section_id}:${row.reservation_date}:${row.booking_slot}`));
  return rows.filter((row) => row.record_type !== "schedule" || !reserved.has(`${row.section_id}:${row.reservation_date}:${row.booking_slot}`))
    .sort((a, b) => a.reservation_date.localeCompare(b.reservation_date) || a.reservation_time.localeCompare(b.reservation_time) || a.id.localeCompare(b.id));
}
