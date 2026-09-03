import VenueCard from "@/components/venues/VenueCard";
import { getVenues } from "@/lib/venues";


export default function VenuesPage() {
  const venues = getVenues();

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div className="mb-10">
        <h1 className="text-4xl font-semibold">
          Explore venues
        </h1>

        <p className="mt-3 text-neutral-600">
          Browse available section options in
          Columbia.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {venues.map((venue) => (
          <VenueCard
            key={venue.id}
            venue={venue}
          />
        ))}
      </div>
    </section>
  );
}