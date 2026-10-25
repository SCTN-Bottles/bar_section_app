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
    signText?: string;
    restart?: string;
  };
};

export default function VenuePageClient({
  initialVenue,
  initialReservation,
}: VenuePageClientProps) {
  const { venue, hydrated, venueError, beverageError, sectionError } = useVenueByName(initialVenue.venueName);
  const activeVenue = venue ?? initialVenue;
  const venueKey = JSON.stringify(activeVenue);

  if (!hydrated) {
    return <main className="mx-auto max-w-7xl px-6 py-16 text-neutral-500">Loading venue options…</main>;
  }

  if (venueError) {
    return <main role="alert" className="mx-auto max-w-7xl px-6 py-16 text-red-700">{venueError}</main>;
  }

  return (
    <>
      <VenueHeader venue={activeVenue} />

      <section className="mx-auto max-w-7xl px-6 py-12">
        {beverageError && <p role="alert" className="mb-6 text-red-700">{beverageError}</p>}
        {sectionError && <p role="alert" className="mb-6 text-red-700">{sectionError}</p>}
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
