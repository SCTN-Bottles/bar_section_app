"use client";
import { useState, type FormEvent } from "react";

export default function PaymentForm({ token }: { token: string }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function pay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const reservationNumber = new FormData(event.currentTarget).get("reservationNumber");
    try {
      const response = await fetch("/api/payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, reservationNumber }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      window.location.assign(result.url);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not start payment.");
      setBusy(false);
    }
  }
  return <form onSubmit={pay} className="mt-6 space-y-4">
    <label className="block">Reservation number
      <input name="reservationNumber" required className="mt-2 w-full rounded border p-3" autoComplete="off" />
    </label>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <button disabled={busy} className="rounded bg-primary px-5 py-3 text-on-primary">{busy ? "Opening checkout…" : "Pay deposit with Stripe"}</button>
  </form>;
}
