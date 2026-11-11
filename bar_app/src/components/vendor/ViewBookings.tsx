"use client";

import { useEffect, useState } from "react";
import { formatBookingTime } from "@/lib/booking-time";
import { bookingDates, bookingToday, loadVendorBookings, validBookingDates, type VendorBooking } from "@/lib/vendor-bookings";

const buttonClass = "rounded-md border border-neutral-300 px-4 py-3 text-sm font-semibold hover:border-primary disabled:opacity-50";
const statuses: Record<string, string> = { available: "Available", pending: "Pending review", confirmed: "Approved", completed: "Completed", cancelled: "Cancelled", sold: "Marked sold" };
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" }).format(new Date(`${date}T12:00:00`));
}

export default function ViewBookings({ venueId }: { venueId: string }) {
  const [start, setStart] = useState(bookingToday);
  const [end, setEnd] = useState(bookingToday);
  const today = bookingToday();
  const [version, setVersion] = useState(0);
  const [selectedDate, setSelectedDate] = useState("");
  const [result, setResult] = useState<{ key: string; bookings: VendorBooking[]; error: string } | null>(null);
  const valid = validBookingDates(start, end);
  const key = `${venueId}:${start}:${end}:${version}`;

  useEffect(() => {
    if (!valid) return;
    let cancelled = false;
    loadVendorBookings(venueId, start, end).then(
      (bookings) => { if (!cancelled) setResult({ key, bookings, error: "" }); },
      (error) => { if (!cancelled) setResult({ key, bookings: [], error: error instanceof Error ? error.message : "Bookings could not be loaded." }); },
    );
    return () => { cancelled = true; };
  }, [venueId, start, end, key, valid]);

  const loading = valid && result?.key !== key;
  const current = valid && result?.key === key ? result : null;
  const dates = bookingDates(start, end);
  const activeDate = dates.includes(selectedDate) ? selectedDate : dates[0];
  const visibleBookings = current?.bookings.filter((booking) => booking.reservation_date === activeDate) ?? [];

  return <section id="bookings-panel" role="tabpanel" aria-labelledby="bookings-tab" className="mt-8 space-y-6 pb-12">
    <div>
      <h2 className="text-2xl font-semibold">View Bookings</h2>
      <p className="mt-2 text-sm text-neutral-500">Choose today or future dates to see available sections and reservations. Select a day below to view its details.</p>
    </div>
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-neutral-300 bg-neutral-50 p-5">
      <label className="min-w-0 text-sm text-neutral-500">Start date<input type="date" value={start} min={today} onChange={(event) => { const value = event.target.value; setStart(value); if (value > end) setEnd(value); }} className="input mt-1" /></label>
      <label className="min-w-0 text-sm text-neutral-500">End date<input type="date" value={end} min={start > today ? start : today} onChange={(event) => setEnd(event.target.value)} className="input mt-1" /></label>
      <button type="button" onClick={() => { const date = bookingToday(); setStart(date); setEnd(date); }} className={buttonClass}>Today</button>
      <button type="button" disabled={!valid || loading} onClick={() => setVersion((value) => value + 1)} className={buttonClass}>Refresh bookings</button>
    </div>
    {!valid && <p role="alert" className="text-sm text-red-700">Choose a valid start and end date from today onward. The end date must be on or after the start date.</p>}
    <div aria-busy={loading} className="space-y-6">
      {loading && <p role="status" className="text-sm text-neutral-500">Loading bookings…</p>}
      {current?.error ? <div className="space-y-3"><p role="alert" className="text-red-700">{current.error}</p><button type="button" onClick={() => setVersion((value) => value + 1)} className={buttonClass}>Retry loading bookings</button></div> : current && <>
        <div role="tablist" aria-label="Booking days" className="flex flex-wrap gap-2">
          {dates.map((date) => <button key={date} id={`view-booking-day-${date}`} type="button" role="tab"
            aria-selected={activeDate === date} aria-controls="view-booking-day-panel" onClick={() => setSelectedDate(date)}
            className={buttonClass + (activeDate === date ? " border-primary bg-primary text-on-primary" : "")}>
            {formatDate(date)}
          </button>)}
        </div>
        <section id="view-booking-day-panel" role="tabpanel" aria-labelledby={`view-booking-day-${activeDate}`} className="space-y-3">
          <h3 className="text-lg font-semibold">{formatDate(activeDate)}</h3>
          {!visibleBookings.length && <p role="status" className="text-sm text-neutral-500">No sections or reservations for this day.</p>}
          <div className="grid gap-4 lg:grid-cols-2">{visibleBookings.map((booking) => <article key={booking.id} className="space-y-3 rounded-xl border border-neutral-300 bg-neutral-50 p-5 [overflow-wrap:anywhere]">
            <div className="flex flex-wrap items-start justify-between gap-2"><h4 className="text-lg font-semibold">{booking.section_name}</h4><span className="rounded-md border border-neutral-300 px-2 py-1 text-xs font-medium">{statuses[booking.status] ?? booking.status}</span></div>
            <p className="text-sm text-neutral-500">{formatBookingTime(booking.reservation_time.slice(0, 5))} · {booking.booking_slot === "day" ? "Daytime" : "Nighttime"}</p>
            {booking.record_type === "reservation" && <div><p className="font-medium">{booking.customer_name || "Guest details not recorded"}</p>{booking.customer_email && <p className="text-sm text-neutral-500">{booking.customer_email}</p>}</div>}
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-neutral-500">{booking.record_type === "schedule" ? "Capacity" : "Guests"}</dt><dd>{booking.guest_count}</dd></div>
              <div><dt className="text-neutral-500">Deposit</dt><dd>{money(booking.deposit_amount)}</dd></div>
              <div><dt className="text-neutral-500">Minimum spend</dt><dd>{money(booking.minimum_spend_amount)}</dd></div>
            </dl>
            {booking.record_type === "reservation" && <>
              <p className="whitespace-pre-wrap text-sm">Drink sign: {booking.drink_sign_text || "None"}</p>
              <div className="text-sm"><p className="text-neutral-500">Drink requests</p>{booking.beverages?.length ? <ul>{booking.beverages.map((drink, index) => <li key={index}>{drink.quantity} × {drink.name}</li>)}</ul> : <p>None</p>}</div>
              <p className="text-xs text-neutral-500">Reservation number: {booking.id}</p>
            </>}
          </article>)}</div>
        </section>
      </>}
    </div>
  </section>;
}
