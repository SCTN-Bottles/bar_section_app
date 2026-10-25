import { notFound, redirect } from "next/navigation";
import { getVenues } from "@/lib/venues";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const venues = await getVenues();
  if (venues.length === 0) notFound();
  redirect(`/${venues[0].venueName}`);
}
