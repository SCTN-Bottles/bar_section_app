"use client";

import { Venue } from "@/types/venue";

type VenueHeaderProps = {
  venue: Venue;
};

export default function VenueHeader({
  venue,
}: VenueHeaderProps) {
  const homeHref = `/${venue.venueName}?restart=1`;

  return (
    <header className="venue-header border-b-2">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <a
          href={homeHref}
          onClick={(event) => {
            event.preventDefault();
            window.location.assign(homeHref);
          }}
          className="text-xl font-semibold text-foreground"
        >
          {venue.name}
        </a>

        <div className="flex items-center gap-4">
          <a href="/vendor/login" className="text-sm text-neutral-500 hover:text-foreground">
            Vendor login
          </a>
          <p className="text-xs text-foreground">Reservations powered by SECTN</p>
        </div>
      </div>
    </header>
  );
}
