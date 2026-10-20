import { notFound } from "next/navigation";

import VenuePageClient from "@/app/[venueName]/VenuePageClient";
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
    signText?: string;
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


  return <VenuePageClient initialVenue={venue} initialReservation={initialReservation} />;
}
