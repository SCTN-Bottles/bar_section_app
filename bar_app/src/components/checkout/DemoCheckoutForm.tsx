"use client";

import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Heading } from "@astryxdesign/core/Heading";


import ActionButton from "@/components/ui/ActionButton";
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
      <VStack className="rounded-xl border border-green-200 bg-green-50 p-6">

        <Heading level={2} className="text-xl font-semibold text-green-900">
          Reservation submitted for review
        </Heading>

        <Text as="p" type="inherit" color="inherit" className="mt-2 text-green-800">
          Your request is pending review by the venue.
          Keep your reservation number for future reference.
        </Text>

      </VStack>
    );
  }


  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
    >

      <VStack>

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
          className="input px-4 py-3"
        />

      </VStack>


      <VStack>

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
          className="input px-4 py-3"
        />

      </VStack>


      {error && <Text as="p" type="inherit" color="inherit" role="alert" className="text-red-700">{error}</Text>}
      <ActionButton
        type="submit"
        disabled={busy}
        variant="primary"
        label={String(busy ? "Submitting…" : "Submit Reservation For Review")}
        className="w-full"
      />


      <Text as="p" type="supporting" color="secondary" className="text-center text-xs text-neutral-500">
        Payment is collected after approval. No payment
        information is collected.
      </Text>

    </form>
  );
}
