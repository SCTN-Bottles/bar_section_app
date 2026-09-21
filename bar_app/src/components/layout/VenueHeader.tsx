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
      <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-4 sm:px-4 sm:py-5">
        <p className="justify-self-start text-[10px] text-foreground sm:text-xs">
          Reservations powered by SECTN
        </p>

        <a
          href={homeHref}
          onClick={(event) => {
            event.preventDefault();
            window.location.assign(homeHref);
          }}
          className="text-base font-semibold text-foreground sm:text-xl"
        >
          {venue.name}
        </a>

        <a
          href="/vendor/login"
          className="justify-self-end rounded-md border border-neutral-300 px-3 py-2 text-xs font-semibold text-foreground hover:border-primary sm:px-4 sm:text-sm"
        >
          Vendor login
        </a>
      </div>
    </header>
  );
}
