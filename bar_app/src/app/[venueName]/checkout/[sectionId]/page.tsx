import { notFound } from "next/navigation";

import CheckoutPageClient from "@/app/[venueName]/checkout/[sectionId]/CheckoutPageClient";
import { getSectionByVenueAndId } from "@/lib/venues";

type CheckoutPageProps = {
  params: Promise<{ venueName: string; sectionId: string }>;
  searchParams: Promise<{ date?: string; time?: string; slot?: string; addons?: string; additional_bands?: string; bandsChoice?: string; signText?: string }>;
};

export default async function CheckoutPage({ params, searchParams }: CheckoutPageProps) {
  const { venueName, sectionId } = await params;
  const { date, time, slot, addons, additional_bands, bandsChoice, signText } = await searchParams;
  const result = await getSectionByVenueAndId(venueName, sectionId);
  if (!result) notFound();

  return (
    <CheckoutPageClient
      initialVenue={result.venue}
      sectionId={sectionId}
      date={date}
      time={time}
      slot={slot}
      addons={addons}
      additional_bands={additional_bands}
      bandsChoice={bandsChoice}
      signText={signText}
    />
  );
}
