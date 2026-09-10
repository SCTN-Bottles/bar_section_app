import { notFound } from "next/navigation";

import VenueHeader from "@/components/layout/VenueHeader";
import VenueExplorer from "@/components/venues/VenueExplorer";

import { getVenueByName } from "@/lib/venues";

type VenuePageProps = {
  params: Promise<{
    venueName: string;
  }>;
};

export default async function VenuePage({
  params,
}: VenuePageProps) {

  const { venueName } = await params;

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

          <p className="text-sm text-black">
            {venue.city}, {venue.state}
          </p>

          <h1 className="mt-2 text-4xl font-semibold tracking-tight">
            Reserve a section at{" "}
            {venue.name}
          </h1>

          <p className="mt-3 max-w-2xl text-black">
            {venue.description}
          </p>

        </div>


        <VenueExplorer venue={venue} />

      </section>
    </>
  );
}
