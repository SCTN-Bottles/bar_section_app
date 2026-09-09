import Link from "next/link";

import { Venue } from "@/types/venue";

type VenueHeaderProps = {
  venue: Venue;
};

export default function VenueHeader({
  venue,
}: VenueHeaderProps) {
  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link
          href={`/${venue.venueName}`}
          className="text-xl font-semibold"
        >
          {venue.name}
        </Link>

        <p className="text-xs text-neutral-500">
          Reservations powered by SECTN
        </p>
      </div>
    </header>
  );
}