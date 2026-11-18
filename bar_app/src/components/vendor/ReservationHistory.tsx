"use client";

import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";


import { useEffect, useState } from "react";
import { ADDITIONAL_BAND_PRICE } from "@/lib/additional-bands";
import { supabase } from "@/lib/supabase";
import { formatBookingTime } from "@/lib/booking-time";
import { bookingHistoryStatus, type BookingHistoryPage } from "@/lib/booking-history";
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
    <VStack>
      <Heading level={2} className="text-2xl font-semibold">Reservation history</Heading>
      <Text as="p" type="supporting" color="secondary" className="mt-2 text-sm text-neutral-500">Past sections marked Reserved or Unreserved, newest first.</Text>
    </VStack>
    <section className="sctn-panel overflow-hidden" aria-busy={loading}>
      <HStack gap={4} vAlign="stretch" wrap="wrap" className="items-end justify-between border-b border-neutral-300 px-5 py-4">
        <VStack>
          <Heading level={3} className="font-semibold">Reservation logs</Heading>
          {data && <Text as="p" type="supporting" color="secondary" className="mt-1 text-sm text-neutral-500">Showing {data.reservations.length} of {data.total} matching reservation{data.total === 1 ? "" : "s"}.</Text>}
        </VStack>
        <HStack gap={3} vAlign="stretch" wrap="wrap" className="items-end">
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
        </HStack>
      </HStack>
      {loading ? <Text as="p" type="inherit" color="inherit" role="status" className="px-5 py-8 text-neutral-500">Loading reservation history…</Text> : error ? <VStack gap={3} className="px-5 py-8"><Text as="p" type="inherit" color="inherit" role="alert">{error}</Text><button type="button" onClick={() => setVersion((value) => value + 1)} className={buttonClass}>Retry loading history</button></VStack> : data?.reservations.length ? <VStack className="overflow-x-auto">
        <table className="portal-table w-full min-w-booking-table text-left text-sm tabular-nums">
          <thead className="bg-neutral-100 text-neutral-500"><tr>
            {["Date", "Guest", "Section", "Drink sign", "Capacity", "Additional bands", "Total guests", "Deposit", "Deposit + bands", "Status"].map((label) => <th key={label} className="px-5 py-3 font-medium">{label}</th>)}
          </tr></thead>
          <tbody>{data.reservations.map((reservation) => <tr key={reservation.booking_id} className="border-t border-neutral-300">
            <td className="whitespace-nowrap px-5 py-4">{formatDate(reservation.reservation_date)}<Text as="span" type="supporting" color="secondary" className="block text-xs text-neutral-500">{formatBookingTime(reservation.reservation_time)} · {reservation.booking_slot}</Text></td>
            <td className="px-5 py-4 wrap-anywhere"><Text as="span" type="inherit" color="inherit" className="block font-medium">{reservation.customer_name || "Guest details not recorded"}</Text><Text as="span" type="supporting" color="secondary" className="block text-xs text-neutral-500">{reservation.customer_email}</Text></td>
            <td className="px-5 py-4">{reservation.section_name}<Text as="span" type="supporting" color="secondary" className="block text-xs text-neutral-500">{venueAreaLabels[reservation.section_area as VenueArea] ?? reservation.section_area}</Text></td>
            <td className="min-w-40 max-w-64 whitespace-pre-wrap px-5 py-4 wrap-anywhere">{reservation.drink_sign_text || "—"}</td>
            <td className="px-5 py-4">{reservation.section_capacity}</td>
            <td className="px-5 py-4">{reservation.additional_bands ?? 0}<Text as="span" type="supporting" color="secondary" className="block text-xs text-neutral-500">${((reservation.additional_bands ?? 0) * ADDITIONAL_BAND_PRICE).toFixed(2)}</Text></td>
            <td className="px-5 py-4">{reservation.section_capacity + (reservation.additional_bands ?? 0)}</td>
            <td className="px-5 py-4">${Number(reservation.deposit_amount).toFixed(2)}</td>
            <td className="px-5 py-4">${(Number(reservation.deposit_amount) + (reservation.additional_bands ?? 0) * ADDITIONAL_BAND_PRICE).toFixed(2)}</td>
            <td className="px-5 py-4">{bookingHistoryStatus(reservation.status)}</td>
          </tr>)}</tbody>
        </table>
      </VStack> : <Text as="p" type="supporting" color="secondary" className="px-5 py-8 text-sm text-neutral-500">{month || year ? "No reservations match the selected month and year." : "No past sections or reservations have been recorded yet."}</Text>}
      {data && data.total > 0 && <HStack gap={4} vAlign="stretch" className="items-center justify-between border-t border-neutral-300 px-5 py-4 text-sm">
        <Text as="span" type="inherit" color="inherit" className="text-neutral-500">Page {data.page} of {totalPages}</Text>
        <HStack gap={2} vAlign="stretch" className="">
          <button type="button" disabled={data.page === 1} onClick={() => setPage(data.page - 1)} className={buttonClass}>Previous</button>
          <button type="button" disabled={data.page >= totalPages} onClick={() => setPage(data.page + 1)} className={buttonClass}>Next</button>
        </HStack>
      </HStack>}
    </section>
  </section>;
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(year, month - 1, day));
}
