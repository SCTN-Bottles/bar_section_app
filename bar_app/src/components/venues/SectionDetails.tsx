"use client";

import { Section } from "@/types/venue";

type SectionDetailsProps = {
  venueName: string;
  section: Section;
  bookingDate: string;
  bookingTime: string;
  onReserve: () => void;
};

export default function SectionDetails({
  venueName,
  section,
  bookingDate,
  bookingTime,
  onReserve,
}: SectionDetailsProps) {
  const sold = section.status === "sold";
  const availabilityLabel = sold ? "Sold" : "Available";

  return (
    <div className="rounded-xl border border-neutral-300 bg-neutral-50 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-neutral-500">Selected section</p>
          <h2 className="section-heading mt-1">{section.name}</h2>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-sm ${
            sold ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
          }`}
        >
          {availabilityLabel}
        </span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-[150px_1fr]">
        <div className="relative h-32 overflow-hidden rounded-lg bg-neutral-100 sm:h-full">
          {section.imagePath ? (
            <img
              src={section.imagePath}
              alt={`${section.name} section at ${venueName}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-neutral-400">
              Section photo
            </div>
          )}
        </div>

        <div>
          <dl className="space-y-3">
            <div className="flex justify-between gap-3">
              <dt className="text-neutral-500">Minimum spend</dt>
              <dd className="font-medium">${section.minimumSpend}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-neutral-500">Capacity</dt>
              <dd className="font-medium">Up to {section.capacity} guests</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-neutral-500">Deposit</dt>
              <dd className="font-medium">${section.deposit}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-neutral-500">Reservation</dt>
              <dd className="text-right font-medium">{bookingDate} · {bookingTime}</dd>
            </div>
          </dl>
        </div>
      </div>

      <p className="mt-4 text-sm text-neutral-600">{section.description}</p>

      <button
        type="button"
        onClick={onReserve}
        className="mt-5 w-full rounded-md bg-primary px-5 py-3 font-medium text-on-primary hover:bg-accent"
      >
        Reserve section
      </button>
    </div>
  );
}
