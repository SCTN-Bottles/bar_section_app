"use client";

import {
  FormEvent,
  useState,
} from "react";

type DemoCheckoutFormProps = {
  onComplete: (details: { customerName: string; customerEmail: string }) => Promise<void>;
};

export default function DemoCheckoutForm({
  onComplete,
}: DemoCheckoutFormProps) {

  const [
    submitted,
    setSubmitted,
  ] = useState(false);


  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await onComplete({
        customerName: String(data.get("name") ?? "").trim(),
        customerEmail: String(data.get("email") ?? "").trim(),
      });
      setSubmitted(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Submission failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }


  if (submitted) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6">

        <h2 className="text-xl font-semibold text-green-900">
          Reservation submitted for review
        </h2>

        <p className="mt-2 text-green-800">
          Your request is pending review by the venue.
          Keep your reservation number for future reference.
        </p>

      </div>
    );
  }


  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
    >

      <div>

        <label
          htmlFor="name"
          className="mb-2 block text-sm font-medium"
        >
          Name
        </label>

        <input
          id="name"
          name="name"
          required
          placeholder="Your name"
          className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-4 py-3 outline-none focus:border-primary"
        />

      </div>


      <div>

        <label
          htmlFor="email"
          className="mb-2 block text-sm font-medium"
        >
          Email
        </label>

        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-4 py-3 outline-none focus:border-primary"
        />

      </div>


      {error && <p role="alert" className="text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-md bg-primary px-5 py-3 font-medium text-on-primary hover:bg-accent"
      >
        {busy ? "Submitting…" : "Submit Reservation For Review"}
      </button>


      <p className="text-center text-xs text-neutral-500">
        Payment is collected after approval. No payment
        information is collected.
      </p>

    </form>
  );
}
