"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Request = {
  id: string; customer_name: string; customer_email: string; section_name: string;
  reservation_date: string; reservation_time: string; booking_slot: string;
  guest_count: number; deposit_amount: number; minimum_spend_amount: number;
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
    <h2 className="text-2xl font-semibold">Pending reservations</h2>
    <p className="text-sm text-neutral-500">Requests awaiting review and approved reservations awaiting payment. Approved guests receive an email with a payment link and one hour to pay.</p>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {loading ? <p role="status">Loading requests…</p> : !requests.length && <p>No reservations are awaiting review or payment.</p>}
    {requests.map((request) => <article key={request.id} className="space-y-3 rounded-xl border border-neutral-300 bg-neutral-50 p-5 [overflow-wrap:anywhere]">
      <h3 className="text-xl font-semibold">{request.section_name}</h3>
      <p className="text-sm text-neutral-500">{request.status === "confirmed" ? "Approved · Awaiting payment · Section held" : "Pending management review"}</p>
      {request.status === "confirmed" && request.payment_deadline && <p className="text-sm text-neutral-500">Payment due by {new Date(request.payment_deadline).toLocaleString()}.</p>}
      <p>{request.customer_name} · {request.customer_email}</p>
      <p>{request.reservation_date} · {request.booking_slot} · {request.reservation_time} · {request.guest_count} guests</p>
      <p>Deposit ${request.deposit_amount} · Minimum spend ${request.minimum_spend_amount}</p>
      <p className="whitespace-pre-wrap">Drink sign: {request.drink_sign_text || "None"}</p>
      <ul>{request.beverages.map((drink, index) => <li key={index}>{drink.quantity} × {drink.name}</li>)}</ul>
      <p className="break-all text-sm">Reservation number: {request.id}</p>
      <div className="flex gap-3">
        <button disabled={!!busy} onClick={() => void review(request.id, "confirmed")} className="rounded-md bg-primary px-4 py-2 text-on-primary disabled:opacity-50">{request.status === "confirmed" ? "Retry approval email" : "Approve"}</button>
        <button disabled={!!busy || request.status !== "pending"} onClick={() => void review(request.id, "cancelled")} className="rounded-md border border-neutral-300 px-4 py-2 hover:border-primary disabled:opacity-50">Deny</button>
      </div>
    </article>)}
  </section>;
}

