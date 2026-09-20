import { notFound } from "next/navigation";

import CheckoutPageClient from "@/app/[venueName]/checkout/[sectionId]/CheckoutPageClient";
import { getSectionByVenueAndId } from "@/lib/venues";

type CheckoutPageProps = {
  params: Promise<{ venueName: string; sectionId: string }>;
  searchParams: Promise<{ date?: string; time?: string; addons?: string }>;
};

export default async function CheckoutPage({ params, searchParams }: CheckoutPageProps) {
  const { venueName, sectionId } = await params;
  const { date, time, addons } = await searchParams;
  const result = getSectionByVenueAndId(venueName, sectionId);
  if (!result) notFound();

  return (
    <CheckoutPageClient
      initialVenue={result.venue}
      sectionId={sectionId}
      date={date}
      time={time}
      addons={addons}
    />
  );
}
