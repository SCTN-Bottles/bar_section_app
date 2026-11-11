import { supabase } from "@/lib/supabase";
import type { VenueArea } from "@/types/venue";

export type VendorBooking = {
  id: string;
  reservation_id: string | null;
  section_id: string;
  sections: { area: VenueArea } | null;
  record_type: "reservation" | "schedule";
  customer_name: string | null;
  customer_email: string | null;
  section_name: string;
  reservation_date: string;
  reservation_time: string;
  booking_slot: string;
  section_capacity: number;
  deposit_amount: number;
  minimum_spend_amount: number;
  drink_sign_text: string | null;
  status: string;
  beverages: { name: string; quantity: number }[] | null;
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

export function bookingDates(bookings: Pick<VendorBooking, "reservation_date">[]): string[] {
  return [...new Set(bookings.map((booking) => booking.reservation_date))].sort();
}

export async function loadVendorBookings(venueId: string, start: string, end: string): Promise<VendorBooking[]> {
  if (!venueId || !validBookingDates(start, end)) throw new Error("Choose a valid start and end date from today onward. The end date must be on or after the start date.");
  const rows: VendorBooking[] = [];
  for (let offset = 0; ; offset += 200) {
    const { data, error } = await supabase.schema("sctn-dev").from("bookings")
      .select("id,reservation_id,section_id,record_type,customer_name,customer_email,section_name,reservation_date,reservation_time,booking_slot,section_capacity,deposit_amount,minimum_spend_amount,drink_sign_text,status,beverages,sections!inner(venue_id,area)")
      .eq("sections.venue_id", venueId)
      .in("record_type", ["reservation", "schedule"])
      .gte("reservation_date", start).lte("reservation_date", end)
      .order("reservation_date").order("reservation_time").order("id")
      .range(offset, offset + 199);
    if (error) throw new Error("Bookings could not be loaded. Please try again.");
    rows.push(...(data ?? []).map((row) => ({
      ...row,
      sections: (Array.isArray(row.sections) ? row.sections[0] : row.sections) ?? null,
    })));
    if (!data || data.length < 200) break;
  }
  return rows
    .sort((a, b) => a.reservation_date.localeCompare(b.reservation_date) || a.reservation_time.localeCompare(b.reservation_time) || a.id.localeCompare(b.id));
}
