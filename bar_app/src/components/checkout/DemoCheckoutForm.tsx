"use client";

import {
  FormEvent,
  useState,
} from "react";

type DemoCheckoutFormProps = {
  maxGuests: number;
};

export default function DemoCheckoutForm({
  maxGuests,
}: DemoCheckoutFormProps) {

  const [
    submitted,
    setSubmitted,
  ] = useState(false);


  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSubmitted(true);
  }


  if (submitted) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6">

        <h2 className="text-xl font-semibold text-green-900">
          Demo reservation complete
        </h2>

        <p className="mt-2 text-green-800">
          No payment was processed.
          This is only the prototype.
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


      <div>

        <label
          htmlFor="guests"
          className="mb-2 block text-sm font-medium"
        >
          Number of guests
        </label>

        <input
          id="guests"
          name="guests"
          type="number"
          min={1}
          max={maxGuests}
          required
          placeholder="8"
          className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-4 py-3 outline-none focus:border-primary"
        />

      </div>


      <button
        type="submit"
        className="w-full rounded-md bg-primary px-5 py-3 font-medium text-on-primary hover:bg-accent"
      >
        Complete demo reservation
      </button>


      <p className="text-center text-xs text-neutral-500">
        Prototype only. No payment
        information is collected.
      </p>

    </form>
  );
}
