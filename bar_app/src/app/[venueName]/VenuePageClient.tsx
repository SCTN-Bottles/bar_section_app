"use client";

import VenueHeader from "@/components/layout/VenueHeader";
import VenueExplorer from "@/components/venues/VenueExplorer";
import { useVenueByName } from "@/components/providers/VenueDataProvider";
import { Venue } from "@/types/venue";

type VenuePageClientProps = {
  initialVenue: Venue;
  initialReservation: {
    date?: string;
    time?: string;
    sectionId?: string;
    step?: string;
    addons?: string;
    restart?: string;
  };
};

export default function VenuePageClient({
  initialVenue,
  initialReservation,
}: VenuePageClientProps) {
  const { venue } = useVenueByName(initialVenue.venueName);
  const activeVenue = venue ?? initialVenue;
  const venueKey = JSON.stringify(activeVenue);

  return (
    <>
      <VenueHeader venue={activeVenue} />

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-10">
          <p className="page-supporting-text text-sm">
            {activeVenue.city}, {activeVenue.state}
          </p>
          <h1 className="display-heading mt-2">
            Reserve a section at {activeVenue.name}
          </h1>
          <p className="page-supporting-text mt-3 max-w-2xl">{activeVenue.description}</p>
        </div>

        <VenueExplorer
          key={`${initialReservation.restart ?? "reservation"}-${venueKey}`}
          venue={activeVenue}
          initialReservation={initialReservation}
        />
      </section>
    </>
  );
}
