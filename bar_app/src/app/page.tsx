import Link from "next/link";

import VenueCard from "@/components/venues/VenueCard";
import { getVenues } from "@/lib/venues";

export default function HomePage() {
  const venues = getVenues();

  return (
    <>
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="max-w-2xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-wider text-neutral-500">
            Columbia, Missouri
          </p>

          <h1 className="text-5xl font-semibold tracking-tight md:text-6xl">
            Find your section.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-neutral-600">
            Browse sections, compare options, and
            reserve your night from one place.
          </p>

          <Link
            href="/venues"
            className="mt-8 inline-block rounded-lg bg-black px-6 py-3 font-medium text-white hover:bg-neutral-800"
          >
            Explore venues
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">
            Popular at Mizzou
          </h2>

          <Link
            href="/venues"
            className="text-sm text-neutral-600 hover:text-black"
          >
            View all
          </Link>
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
    </>
  );
}