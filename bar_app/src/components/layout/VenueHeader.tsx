import Link from "next/link";

import { Venue } from "@/types/venue";

type VenueHeaderProps = {
  venue: Venue;
};

export default function VenueHeader({
  venue,
}: VenueHeaderProps) {
  return (
    <header className="venue-header border-b-2">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link
          href={`/${venue.venueName}`}
          className="text-xl font-semibold text-black"
        >
          {venue.name}
        </Link>

        <p className="text-xs text-black">
          Reservations powered by SECTN
        </p>
      </div>
    </header>
  );
}
