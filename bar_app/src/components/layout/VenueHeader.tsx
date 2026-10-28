"use client";

import { Venue } from "@/types/venue";
import Link from "next/link";

type VenueHeaderProps = {
  venue: Venue;
};

export default function VenueHeader({
  venue,
}: VenueHeaderProps) {
  const homeHref = `/${venue.venueName}?restart=1`;

  return (
    <header className="venue-header border-b-2">
      <div className="venue-header-content grid w-full items-center gap-2 px-3 py-3 sm:px-4">
        <p className="justify-self-start text-[10px] text-foreground sm:text-xs">
          Reservations powered by SCTN
        </p>

        <a
          href={homeHref}
          className="venue-header-title text-base font-semibold text-foreground sm:text-xl"
        >
          {venue.name}
        </a>

        <Link
          href="/vendor"
          className="col-span-3 inline-flex min-h-11 items-center justify-self-end rounded-md border border-neutral-300 px-3 py-2 text-xs font-semibold text-foreground hover:border-primary sm:col-span-1 sm:px-4 sm:text-sm"
        >
          Vendor portal
        </Link>
      </div>
    </header>
  );
}
