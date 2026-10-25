import { getSectionMapPosition } from "@/data/section-layout";
import { supabase } from "@/lib/supabase";
import type { Section, SectionStatus, VenueArea } from "@/types/venue";
import { venueAreas } from "@/types/venue";

const devDb = supabase.schema("sctn-dev");

type SectionRow = {
  id: string;
  name: string;
  area: string;
  description: string;
  capacity: number;
  minimum_spend: number | string;
  deposit_amount: number | string;
  status: string;
  image_url: string | null;
};

function toSection(row: SectionRow): Section {
  if (!venueAreas.includes(row.area as VenueArea)) {
    throw new Error(`Unknown section area: ${row.area}`);
  }
  if (row.status !== "available" && row.status !== "sold") {
    throw new Error(`Unknown section status: ${row.status}`);
  }

  return {
    id: row.id,
    name: row.name,
    area: row.area as VenueArea,
    description: row.description,
    capacity: row.capacity,
    minimumSpend: Number(row.minimum_spend),
    deposit: Number(row.deposit_amount),
    status: row.status as SectionStatus,
    imagePath: row.image_url ?? undefined,
    mapPosition: getSectionMapPosition(row.id),
  };
}

export async function getSections(venueName: string): Promise<Section[]> {
  const { data: venue, error: venueError } = await devDb
    .from("venues")
    .select("id")
    .eq("slug", venueName.toLowerCase())
    .single();
  if (venueError) throw venueError;

  const { data, error } = await devDb
    .from("sections")
    .select("id, name, area, description, capacity, minimum_spend, deposit_amount, status, image_url")
    .eq("venue_id", venue.id)
    .eq("is_active", true)
    .order("area")
    .order("name");
  if (error) throw error;
  return (data as SectionRow[]).map(toSection);
}

export async function saveSections(
  venueId: string,
  venueName: string,
  original: Section[],
  sections: Section[],
): Promise<Section[]> {
  const originalById = new Map(original.map((section) => [section.id, section]));

  for (const section of sections) {
    const previous = originalById.get(section.id);
    if (!previous) throw new Error(`Unknown section: ${section.id}`);
    if (
      previous.name === section.name &&
      previous.description === section.description &&
      previous.capacity === section.capacity &&
      previous.minimumSpend === section.minimumSpend &&
      previous.deposit === section.deposit &&
      previous.status === section.status
    ) continue;

    const { error } = await devDb
      .from("sections")
      .update({
        name: section.name,
        description: section.description,
        capacity: section.capacity,
        minimum_spend: section.minimumSpend,
        deposit_amount: section.deposit,
        status: section.status,
      })
      .eq("venue_id", venueId)
      .eq("id", section.id);
    if (error) throw error;
  }

  return getSections(venueName);
}
