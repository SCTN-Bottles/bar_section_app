export type SectionStatus = "available" | "sold";

export const venueAreas = [
  "indoor",
  "cabanas",
  "attic",
  "bar",
] as const;

export type VenueArea = (typeof venueAreas)[number];

export const venueAreaLabels: Record<VenueArea, string> = {
  indoor: "Indoor",
  cabanas: "Cabanas",
  attic: "The Attic",
  bar: "Couches",
};

export type SectionMapPosition = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Section = {
  id: string;
  name: string;
  area: VenueArea;
  capacity: number;
  minimumSpend: number;
  deposit: number;
  status: SectionStatus;
  description: string;
  imagePath?: string;
  mapPosition: SectionMapPosition;
};

export type BookingCalendar = {
  availableWeekdays: number[];
  placeholderTime: string;
};

export type BeverageType = "bottle" | "keg";

export type BeverageOption = {
  id: string;
  name: string;
  type: BeverageType;
  price: number;
};

export type ReservationBeverage = {
  id: string;
  name: string;
  type: BeverageType;
  price: number;
  quantity: number;
};

export type Reservation = {
  id: string;
  venueId: string;
  sectionId: string;
  sectionName: string;
  sectionArea: VenueArea;
  customerName: string;
  customerEmail: string;
  guestCount: number;
  reservationDate: string;
  reservationTime: string;
  beverages: ReservationBeverage[];
  drinkSignText?: string;
  deposit: number;
  createdAt: string;
};

export type Venue = {
  id: string;
  name: string;
  venueName: string;
  city: string;
  state: string;
  description: string;
  bookingCalendar: BookingCalendar;
  beverages: BeverageOption[];
  sections: Section[];
};
