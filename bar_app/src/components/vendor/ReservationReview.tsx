"use client";

import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { HStack } from "@astryxdesign/core/Stack";


import ActionButton from "@/components/ui/ActionButton";
import { useEffect, useState } from "react";
import { ADDITIONAL_BAND_PRICE } from "@/lib/additional-bands";
import { supabase } from "@/lib/supabase";

type Request = {
  id: string; customer_name: string; customer_email: string; section_name: string;
  reservation_date: string; reservation_time: string; booking_slot: string;
  additional_bands: number; section_capacity: number; deposit_amount: number; minimum_spend_amount: number;
  drink_sign_text: string; status: string;
  payment_deadline: string | null;
  beverages: { name: string; quantity: number }[];
};

export default function ReservationReview({ venueId, onReservationChanged }: { venueId: string; onReservationChanged?: () => void }) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;
    async function load() {
      if (inFlight || cancelled) return;
      inFlight = true;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(`/api/reservations/pending?venueId=${encodeURIComponent(venueId)}`, {
          headers: { Authorization: `Bearer ${session?.access_token ?? ""}` }, cache: "no-store",
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not load requests.");
        if (!cancelled) { setRequests(result.requests); setError(result.warning || ""); }
      } catch (error) {
        if (!cancelled) setError(error instanceof Error ? error.message : "Could not load requests. Please refresh.");
      } finally {
        inFlight = false;
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    const timer = window.setInterval(() => { void load(); }, 15000);
    const onFocus = () => { void load(); };
    window.addEventListener("focus", onFocus);
    const channel = supabase.channel(`review-${venueId}`)
      .on("broadcast", { event: "review_changed" }, () => { void load(); })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void load();
      });
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      void supabase.removeChannel(channel);
    };
  }, [venueId, version]);

  async function review(id: string, status: "confirmed" | "cancelled") {
    const wasPending = requests.some((request) => request.id === id && request.status === "pending");
    setBusy(id);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/reservations/review", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({ id, status }),
      });
      const result = await response.json();
      if (!response.ok || result.warning) setError(result.warning || result.error);
      if (response.ok && wasPending) onReservationChanged?.();
    } catch { setError("Could not update the reservation. Please try again."); }
    finally { setBusy(""); }
    setVersion((value) => value + 1);
  }

  return <section className="mt-8 space-y-4">
    <Heading level={2} className="text-2xl font-semibold">Pending reservations</Heading>
    <Text as="p" type="supporting" color="secondary" className="text-sm text-neutral-500">Requests awaiting review and approved reservations awaiting payment. Approved guests receive an email with a payment link and one hour to pay.</Text>
    {error && <Text as="p" type="inherit" color="inherit" role="alert" className="text-red-700">{error}</Text>}
    {loading ? <Text as="p" type="inherit" color="inherit" role="status">Loading requests…</Text> : !requests.length && <Text as="p" type="inherit" color="inherit">No reservations are awaiting review or payment.</Text>}
    {requests.map((request) => <article key={request.id} className="sctn-panel space-y-3 p-5 wrap-anywhere">
      <Heading level={3} className="text-xl font-semibold">{request.section_name}</Heading>
      <Text as="p" type="supporting" color="secondary" className="text-sm text-neutral-500">{request.status === "confirmed" ? "Approved · Awaiting payment · Section held" : "Pending management review"}</Text>
      {request.status === "confirmed" && request.payment_deadline && <Text as="p" type="supporting" color="secondary" className="text-sm text-neutral-500">Payment due by {new Date(request.payment_deadline).toLocaleString()}.</Text>}
      <Text as="p" type="inherit" color="inherit">{request.customer_name} · {request.customer_email}</Text>
      <Text as="p" type="inherit" color="inherit">{request.reservation_date} · {request.booking_slot} · {request.reservation_time} · Capacity {request.section_capacity}</Text>
      <Text as="p" type="inherit" color="inherit">Additional bands: {request.additional_bands ?? 0} · Band charge ${((request.additional_bands ?? 0) * ADDITIONAL_BAND_PRICE).toFixed(2)} · Total guest allowance {request.section_capacity + (request.additional_bands ?? 0)}</Text>
      <Text as="p" type="inherit" color="inherit">Total due after approval ${(Number(request.deposit_amount) + (request.additional_bands ?? 0) * ADDITIONAL_BAND_PRICE).toFixed(2)}</Text>
      <Text as="p" type="inherit" color="inherit">Deposit ${request.deposit_amount} · Minimum spend ${request.minimum_spend_amount}</Text>
      <Text as="p" type="inherit" color="inherit" className="whitespace-pre-wrap">Drink sign: {request.drink_sign_text || "None"}</Text>
      <ul>{request.beverages.map((drink, index) => <li key={index}>{drink.quantity} × {drink.name}</li>)}</ul>
      <Text as="p" type="inherit" color="inherit" className="break-all text-sm">Reservation number: {request.id}</Text>
      <HStack gap={3} vAlign="stretch" className="">
        <ActionButton disabled={!!busy} onClick={() => void review(request.id, "confirmed")} variant="primary" label={request.status === "confirmed" ? "Retry approval email" : "Approve"} type="button" />
        <ActionButton disabled={!!busy || request.status !== "pending"} onClick={() => void review(request.id, "cancelled")} variant="secondary" label="Deny" type="button" />
      </HStack>
    </article>)}
  </section>;
}

