"use client";

import { Text } from "@astryxdesign/core/Text";
import { TopNav, TopNavHeading } from "@astryxdesign/core/TopNav";


import ActionButton from "@/components/ui/ActionButton";
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
      <TopNav
        label="Venue navigation"
        className="sctn-top-nav"
        heading={<Text as="p" type="inherit" color="inherit" className="text-xs text-white">Reservations powered by SCTN</Text>}
        centerContent={<TopNavHeading className="venue-brand" heading={venue.name} headingHref={homeHref} as="a" />}
        endContent={<ActionButton href="/vendor" variant="secondary" label="Vendor portal" />}
      />
    </header>
  );
}
