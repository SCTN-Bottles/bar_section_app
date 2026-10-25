import { getSections } from "@/lib/sections";
import { supabase } from "@/lib/supabase";
import type { Venue } from "@/types/venue";

const devDb = supabase.schema("sctn-dev");
const venueColumns = "id, name, slug, description, city, state, booking_weekdays, booking_start_time";

type VenueRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  city: string;
  state: string;
  booking_weekdays: number[];
  booking_start_time: string;
};

function toVenue(row: VenueRow): Venue {
  return {
    id: row.id,
    name: row.name,
    venueName: row.slug,
    city: row.city,
    state: row.state,
    description: row.description,
    bookingCalendar: {
      availableWeekdays: row.booking_weekdays,
      placeholderTime: row.booking_start_time.slice(0, 5),
    },
    sections: [],
    beverages: [],
  };
}

export async function getVenues(): Promise<Venue[]> {
  const { data, error } = await devDb
    .from("venues")
    .select(venueColumns)
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return (data as VenueRow[]).map(toVenue);
}

export async function getVenueByName(venueName: string): Promise<Venue | undefined> {
  const { data, error } = await devDb
    .from("venues")
    .select(venueColumns)
    .eq("slug", venueName.toLowerCase())
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return data ? toVenue(data as VenueRow) : undefined;
}

export async function saveVenueSchedule(venue: Venue): Promise<Venue> {
  const { data, error } = await devDb
    .from("venues")
    .update({
      booking_weekdays: venue.bookingCalendar.availableWeekdays,
      booking_start_time: venue.bookingCalendar.placeholderTime,
    })
    .eq("id", venue.id)
    .select(venueColumns)
    .single();
  if (error) throw error;
  return toVenue(data as VenueRow);
}

export async function getSectionByVenueAndId(venueName: string, sectionId: string) {
  const venue = await getVenueByName(venueName);
  if (!venue) return undefined;

  const sections = await getSections(venue.venueName);
  const section = sections.find((item) => item.id === sectionId);
  if (!section) return undefined;

  return { venue: { ...venue, sections }, section };
}
