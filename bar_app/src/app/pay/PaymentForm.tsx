"use client";

import { Text } from "@astryxdesign/core/Text";

import ActionButton from "@/components/ui/ActionButton";
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
      <input name="reservationNumber" required className="input mt-2" autoComplete="off" />
    </label>
    {error && <Text as="p" type="inherit" color="inherit" role="alert" className="text-red-700">{error}</Text>}
    <ActionButton disabled={busy} variant="primary" label={busy ? "Opening checkout…" : "Pay deposit and bands with Stripe"} type="submit" />
  </form>;
}
