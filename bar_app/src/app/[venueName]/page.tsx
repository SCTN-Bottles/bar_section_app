import { notFound } from "next/navigation";

import VenueHeader from "@/components/layout/VenueHeader";
import VenueExplorer from "@/components/venues/VenueExplorer";

import { getVenueByName } from "@/lib/venues";

type VenuePageProps = {
  params: Promise<{
    venueName: string;
  }>;
  searchParams: Promise<{
    date?: string;
    time?: string;
    section?: string;
    step?: string;
    addons?: string;
    restart?: string;
  }>;
};

export default async function VenuePage({
  params,
  searchParams,
}: VenuePageProps) {

  const { venueName } = await params;
  const reservationParams = await searchParams;
  const initialReservation = {
    ...reservationParams,
    sectionId: reservationParams.section,
  };

  const venue =
    getVenueByName(venueName);


  if (!venue) {
    notFound();
  }


  return (
    <>
      <VenueHeader venue={venue} />

      <section className="mx-auto max-w-7xl px-6 py-12">

        <div className="mb-10">

          <p className="page-supporting-text text-sm">
            {venue.city}, {venue.state}
          </p>

          <h1 className="display-heading mt-2">
            Reserve a section at{" "}
            {venue.name}
          </h1>

          <p className="page-supporting-text mt-3 max-w-2xl">
            {venue.description}
          </p>

        </div>


        <VenueExplorer
          key={initialReservation.restart ?? "reservation"}
          venue={venue}
          initialReservation={initialReservation}
        />

      </section>
    </>
  );
}
