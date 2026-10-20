"use client";

import Link from "next/link";

type ReservationAgreementProps = {
  onBack: () => void;
  checkoutHref: string;
};

export default function ReservationAgreement({ onBack, checkoutHref }: ReservationAgreementProps) {
  return (
    <div className="mx-auto max-w-3xl rounded-xl border border-neutral-300 bg-neutral-50 p-6">
      <button type="button" onClick={onBack} className="text-sm text-neutral-500 hover:text-foreground">
        ← Back to drink sign
      </button>

      <div className="mt-6">
        <p className="text-sm text-neutral-500">Step 4 of 5</p>
        <h1 className="mt-1 text-3xl font-semibold">Reservation agreement</h1>
      </div>

      <article className="mt-6 rounded-lg border border-neutral-300 bg-neutral-100 p-6 text-sm leading-6 text-neutral-500">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Demo document</p>
        <h2 className="mt-2 text-xl font-semibold text-foreground">Venue reservation agreement</h2>
        <p className="mt-4">This placeholder agreement outlines the terms for reserving a section at the venue. A final, venue-approved agreement will be provided before launch.</p>

        <h3 className="mt-5 font-semibold text-foreground">Reservation terms</h3>
        <p className="mt-1">The reservation holder is responsible for their guests and for meeting the section&apos;s required minimum spend. The stated deposit is required to confirm the reservation.</p>

        <h3 className="mt-5 font-semibold text-foreground">Damages and conduct</h3>
        <p className="mt-1">The reservation holder may be responsible for repair or replacement costs for damage caused by their party. The venue may end a reservation for unsafe, unlawful, or disruptive behavior.</p>

        <h3 className="mt-5 font-semibold text-foreground">Cancellations</h3>
        <p className="mt-1">Cancellation, refund, and rescheduling terms will be added to the final agreement.</p>

        <p className="mt-6 border-t border-neutral-300 pt-4 text-xs">Placeholder only — this is not a final legal contract.</p>
      </article>

      <Link
        href={checkoutHref}
        className="mt-6 block rounded-md bg-primary px-5 py-3 text-center font-medium text-on-primary hover:bg-accent"
      >
        Continue to checkout
      </Link>
    </div>
  );
}
