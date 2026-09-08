import { notFound } from "next/navigation";

import VenueExplorer from "@/components/venues/VenueExplorer";
import {
  getVenueByName,
  getVenues,
} from "@/lib/venues";

type VenuePageProps = {
  params: Promise<{
    venueName: string;
  }>;
};

export function generateStaticParams() {
  return getVenues().map((venue) => ({
    name: venue.name,
  }));
}

export default async function VenuePage({
  params,
}: VenuePageProps) {
  const { venueName } = await params;

  const venue = getVenueByName(venueName);

  if (!venue) {
    notFound();
  }

  return (
    <section className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-10">
        <p className="text-sm text-neutral-500">
          {venue.city}, {venue.state}
        </p>

        <h1 className="mt-2 text-4xl font-semibold">
          {venue.name}
        </h1>

        <p className="mt-3 max-w-2xl text-neutral-600">
          {venue.description}
        </p>
      </div>

      <VenueExplorer venue={venue} />
    </section>
  );
}