"use client";

import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/Stack";
import { Heading } from "@astryxdesign/core/Heading";


import VenueHeader from "@/components/layout/VenueHeader";
import VenueExplorer from "@/components/venues/VenueExplorer";
import { useVenueByName } from "@/components/providers/VenueDataProvider";
import { Venue } from "@/types/venue";

type VenuePageClientProps = {
  initialVenue: Venue;
  initialReservation: {
    date?: string;
    slot?: string;
    time?: string;
    sectionId?: string;
    step?: string;
    addons?: string;
    additional_bands?: string;
    bandsChoice?: string;
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

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        {beverageError && <Text as="p" type="inherit" color="inherit" role="alert" className="mb-6 text-red-700">{beverageError}</Text>}
        {sectionError && <Text as="p" type="inherit" color="inherit" role="alert" className="mb-6 text-red-700">{sectionError}</Text>}
        <VStack className="page-intro mb-8">
          <Text as="p" type="inherit" color="inherit" className="page-eyebrow">
            {activeVenue.city}, {activeVenue.state}
          </Text>
          <Heading level={1} className="display-heading mt-2">
            Reserve a section at {activeVenue.name}
          </Heading>
          <Text as="p" type="inherit" color="inherit" className="page-supporting-text mt-4 max-w-2xl leading-relaxed">{activeVenue.description}</Text>
        </VStack>

        <VenueExplorer
          key={`${initialReservation.restart ?? "reservation"}-${venueKey}`}
          venue={activeVenue}
          initialReservation={initialReservation}
        />
      </main>
    </>
  );
}
