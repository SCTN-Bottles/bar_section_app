"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatBookingTime } from "@/lib/booking-time";
import type { BookingHistoryPage } from "@/lib/booking-history";
import { venueAreaLabels, type VenueArea } from "@/types/venue";

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const buttonClass = "rounded-md border border-neutral-300 px-3 py-2 text-sm hover:border-primary disabled:cursor-default disabled:opacity-40";

export default function ReservationHistory({ venueId }: { venueId: string }) {
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{ key: string; data: BookingHistoryPage | null; error: string } | null>(null);
  const key = `${venueId}:${year}:${month}:${page}:${version}`;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const params = new URLSearchParams({ venueId, year, month, page: String(page) });
        const response = await fetch(`/api/reservations/history?${params}`, {
          headers: { Authorization: `Bearer ${session?.access_token ?? ""}` }, cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load booking history.");
        if (!cancelled) setResult({ key, data, error: "" });
      } catch (error) {
        if (!cancelled) setResult({ key, data: null, error: error instanceof Error ? error.message : "Could not load booking history." });
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [venueId, year, month, page, key]);

  const loading = result?.key !== key;
  const data = !loading ? result?.data : null;
  const error = !loading ? result?.error : "";
  // Keep available years during a filter change, but never another venue's results.
  const years = result?.key.startsWith(`${venueId}:`) ? result.data?.years ?? [] : [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / 10));

  return <section id="reservations-panel" role="tabpanel" aria-labelledby="reservations-tab" className="mt-8 space-y-6 pb-12">
    <div>
      <h2 className="text-2xl font-semibold">Reservation history</h2>
      <p className="mt-2 text-sm text-neutral-500">Past paid reservations and sections marked sold, newest first.</p>
    </div>
    <section className="overflow-hidden rounded-xl border border-neutral-300 bg-neutral-50" aria-busy={loading}>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral-300 px-5 py-4">
        <div>
          <h3 className="font-semibold">Reservation logs</h3>
          {data && <p className="mt-1 text-sm text-neutral-500">Showing {data.reservations.length} of {data.total} matching reservation{data.total === 1 ? "" : "s"}.</p>}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm text-neutral-500">Month
            <select value={month} onChange={(event) => { setMonth(event.target.value); setPage(1); }} className="input mt-1 min-w-36">
              <option value="">All months</option>
              {months.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
            </select>
          </label>
          <label className="text-sm text-neutral-500">Year
            <select value={year} onChange={(event) => { setYear(event.target.value); setPage(1); }} className="input mt-1 min-w-28">
              <option value="">All years</option>
              {years.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          {(month || year) && <button type="button" onClick={() => { setMonth(""); setYear(""); setPage(1); }} className={buttonClass}>Clear filters</button>}
          <button type="button" disabled={loading} onClick={() => setVersion((value) => value + 1)} className={buttonClass}>Refresh history</button>
        </div>
      </div>
      {loading ? <p role="status" className="px-5 py-8 text-neutral-500">Loading reservation history…</p> : error ? <div className="space-y-3 px-5 py-8"><p role="alert">{error}</p><button type="button" onClick={() => setVersion((value) => value + 1)} className={buttonClass}>Retry loading history</button></div> : data?.reservations.length ? <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-neutral-100 text-neutral-500"><tr>
            {["Date", "Guest", "Section", "Drink sign", "Guests / capacity", "Deposit", "Status"].map((label) => <th key={label} className="px-5 py-3 font-medium">{label}</th>)}
          </tr></thead>
          <tbody>{data.reservations.map((reservation) => <tr key={reservation.booking_id} className="border-t border-neutral-300">
            <td className="whitespace-nowrap px-5 py-4">{formatDate(reservation.reservation_date)}<span className="block text-xs text-neutral-500">{formatBookingTime(reservation.reservation_time)} · {reservation.booking_slot}</span></td>
            <td className="px-5 py-4 [overflow-wrap:anywhere]"><span className="block font-medium">{reservation.customer_name || "Guest details not recorded"}</span><span className="block text-xs text-neutral-500">{reservation.customer_email}</span></td>
            <td className="px-5 py-4">{reservation.section_name}<span className="block text-xs text-neutral-500">{venueAreaLabels[reservation.section_area as VenueArea] ?? reservation.section_area}</span></td>
            <td className="min-w-40 max-w-64 whitespace-pre-wrap px-5 py-4 [overflow-wrap:anywhere]">{reservation.drink_sign_text || "—"}</td>
            <td className="px-5 py-4">{reservation.guest_count}{reservation.record_type === "schedule" ? " capacity" : " guests"}</td>
            <td className="px-5 py-4">${Number(reservation.deposit_amount).toFixed(2)}</td>
            <td className="px-5 py-4">{reservation.paid_at ? "Paid" : "Marked sold"}</td>
          </tr>)}</tbody>
        </table>
      </div> : <p className="px-5 py-8 text-sm text-neutral-500">{month || year ? "No reservations match the selected month and year." : "No past sold reservations have been recorded yet."}</p>}
      {data && data.total > 0 && <div className="flex items-center justify-between gap-4 border-t border-neutral-300 px-5 py-4 text-sm">
        <span className="text-neutral-500">Page {data.page} of {totalPages}</span>
        <div className="flex gap-2">
          <button type="button" disabled={data.page === 1} onClick={() => setPage(data.page - 1)} className={buttonClass}>Previous</button>
          <button type="button" disabled={data.page >= totalPages} onClick={() => setPage(data.page + 1)} className={buttonClass}>Next</button>
        </div>
      </div>}
    </section>
  </section>;
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(year, month - 1, day));
}
