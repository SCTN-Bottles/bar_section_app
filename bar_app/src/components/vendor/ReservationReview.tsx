"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Request = {
  id: string; customer_name: string; customer_email: string; section_name: string;
  reservation_date: string; reservation_time: string; booking_slot: string;
  guest_count: number; deposit_amount: number; minimum_spend_amount: number;
  drink_sign_text: string; status: string;
  beverages: { name: string; quantity: number }[];
};

export default function ReservationReview({ venueId }: { venueId: string }) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const db = supabase.schema("sctn-dev");
    async function load() {
      const { data, error } = await db.from("bookings")
        .select("id,customer_name,customer_email,section_name,reservation_date,reservation_time,booking_slot,guest_count,deposit_amount,minimum_spend_amount,drink_sign_text,status,beverages,sections!inner(venue_id)")
        .eq("sections.venue_id", venueId).eq("record_type", "reservation").in("status", ["pending", "confirmed"])
        .order("created_at");
      if (cancelled) return;
      setLoading(false);
      if (error) setError("Could not load requests. Please refresh.");
      else { setRequests(data ?? []); }
    }
    void load();
    const channel = supabase.channel(`review-${venueId}`)
      .on("broadcast", { event: "review_changed" }, () => { void load(); })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void load();
      });
    return () => { cancelled = true; void supabase.removeChannel(channel); };
  }, [venueId, version]);

  async function review(id: string, status: "confirmed" | "cancelled") {
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
    } catch { setError("Could not update the reservation. Please try again."); }
    finally { setBusy(""); }
    setVersion((value) => value + 1);
  }

  return <section className="mt-8 space-y-4">
    <h2 className="text-2xl font-semibold">Reservations awaiting review</h2>
    <p className="text-sm text-neutral-500">Approved guests receive an email with a private payment link and a 24-hour deadline.</p>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {loading ? <p role="status">Loading requests…</p> : !requests.length && <p>No reservations are awaiting review.</p>}
    {requests.map((request) => <article key={request.id} className="space-y-3 rounded-xl border p-5">
      <h3 className="text-xl font-semibold">{request.section_name}</h3>
      <p>{request.customer_name} · {request.customer_email}</p>
      <p>{request.reservation_date} · {request.booking_slot} · {request.reservation_time} · {request.guest_count} guests</p>
      <p>Deposit ${request.deposit_amount} · Minimum spend ${request.minimum_spend_amount}</p>
      <p className="whitespace-pre-wrap">Drink sign: {request.drink_sign_text || "None"}</p>
      <ul>{request.beverages.map((drink, index) => <li key={index}>{drink.quantity} × {drink.name}</li>)}</ul>
      <p className="break-all text-sm">Reservation number: {request.id}</p>
      <div className="flex gap-3">
        <button disabled={!!busy} onClick={() => void review(request.id, "confirmed")} className="rounded-md bg-primary px-4 py-2 text-on-primary disabled:opacity-50">{request.status === "confirmed" ? "Retry approval email" : "Approve"}</button>
        <button disabled={!!busy || request.status !== "pending"} onClick={() => void review(request.id, "cancelled")} className="rounded-md border px-4 py-2 disabled:opacity-50">Deny</button>
      </div>
    </article>)}
  </section>;
}

