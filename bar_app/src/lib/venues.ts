import { venues } from "@/data/venues";

export function getVenues() {
  return venues;
}

export function getVenueByName(venueName: string){
    return venues.find((venue) => venue.venueName === venueName);
}

export function getSectionByVenueAndId(venueName: string, sectionId: string) {
    const venue = getVenueByName(venueName);

    if (!venue) {
        return undefined;
    }

    const section = venue.sections.find(
        (section) => section.id == sectionId
    );

    if (!section) {
    return undefined;
    }

    return {
    venue, 
    section
    };
}