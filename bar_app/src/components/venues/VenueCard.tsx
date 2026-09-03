import Link from "next/link";

import { Venue } from "@/types/venue";

type VenueCardProps = {
  venue: Venue;
};

export default function VenueCard({
  venue,
}: VenueCardProps) {
  const lowestMinimum = Math.min(
    ...venue.sections.map(
      (section) => section.minimumSpend
    )
  );

  return (
    <article className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="flex h-44 items-center justify-center bg-neutral-100">
        <span className="text-lg font-semibold text-neutral-400">
          {venue.name}
        </span>
      </div>

      <div className="p-5">
        <h2 className="text-xl font-semibold">
          {venue.name}
        </h2>

        <p className="mt-1 text-sm text-neutral-500">
          {venue.city}, {venue.state}
        </p>

        <p className="mt-4 text-sm text-neutral-600">
          Sections from
        </p>

        <p className="text-lg font-semibold">
          ${lowestMinimum}
        </p>

        <Link
          href={`/venues/${venue.venueName}`}
          className="mt-5 block rounded-lg bg-black px-4 py-3 text-center text-sm font-medium text-white hover:bg-neutral-800"
        >
          View sections
        </Link>
      </div>
    </article>
  );
}