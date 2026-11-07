"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { getBeverageOptions } from "@/lib/beverages";
import { getSections } from "@/lib/sections";
import { getVenues } from "@/lib/venues";
import { BeverageOption, Section, Venue, venueAreas } from "@/types/venue";

type VenueDataContextValue = {
  venues: Venue[];
  hydrated: boolean;
  venueError: string | null;
  beverageError: string | null;
  sectionError: string | null;
  updateVenue: (venue: Venue) => boolean;
};

const VenueDataContext = createContext<VenueDataContextValue | null>(null);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isMoney(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isSection(value: unknown): value is Section {
  if (!value || typeof value !== "object") return false;
  const section = value as Section;
  return (
    isNonEmptyString(section.id) &&
    isNonEmptyString(section.name) &&
    venueAreas.includes(section.area) &&
    Number.isInteger(section.capacity) &&
    section.capacity > 0 &&
    isMoney(section.minimumSpend) &&
    isMoney(section.deposit) &&
    (section.status === "available" || section.status === "sold") &&
    isNonEmptyString(section.description) &&
    Number.isFinite(section.mapPosition?.x) &&
    Number.isFinite(section.mapPosition?.y) &&
    Number.isFinite(section.mapPosition?.width) &&
    Number.isFinite(section.mapPosition?.height)
  );
}

function isBeverage(value: unknown): value is BeverageOption {
  if (!value || typeof value !== "object") return false;
  const beverage = value as BeverageOption;
  return (
    isNonEmptyString(beverage.id) &&
    isNonEmptyString(beverage.name) &&
    (beverage.type === "bottle" || beverage.type === "keg") &&
    isMoney(beverage.price)
  );
}

export function isValidVenue(value: unknown): value is Venue {
  if (!value || typeof value !== "object") return false;
  const venue = value as Venue;
  const weekdays = venue.bookingCalendar?.availableWeekdays;
  return (
    isNonEmptyString(venue.id) &&
    isNonEmptyString(venue.name) &&
    isNonEmptyString(venue.venueName) &&
    isNonEmptyString(venue.city) &&
    isNonEmptyString(venue.state) &&
    isNonEmptyString(venue.description) &&
    Array.isArray(weekdays) &&
    weekdays.length > 0 &&
    weekdays.every((day) => Number.isInteger(day) && day >= 0 && day <= 6) &&
    new Set(weekdays).size === weekdays.length &&
    isNonEmptyString(venue.bookingCalendar?.placeholderTime) &&
    Array.isArray(venue.sections) &&
    venue.sections.every(isSection) &&
    new Set(venue.sections.map((section) => section.id)).size === venue.sections.length &&
    Array.isArray(venue.beverages) &&
    venue.beverages.every(isBeverage) &&
    new Set(venue.beverages.map((beverage) => beverage.id)).size === venue.beverages.length
  );
}

export default function VenueDataProvider({ children }: { children: React.ReactNode }) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [venueError, setVenueError] = useState<string | null>(null);
  const [beverageError, setBeverageError] = useState<string | null>(null);
  const [sectionError, setSectionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const baseVenues = await getVenues();
        const loaded = await Promise.all(baseVenues.map(async (venue) => {
          const [beverages, sections] = await Promise.allSettled([
            getBeverageOptions(venue.venueName),
            getSections(venue.venueName),
          ]);
          return { venue, beverages, sections };
        }));

        if (cancelled) return;
        if (loaded.some(({ beverages }) => beverages.status === "rejected")) {
          setBeverageError("Drink options could not be loaded. Please refresh the page.");
        }
        if (loaded.some(({ sections }) => sections.status === "rejected")) {
          setSectionError("Sections could not be loaded. Please refresh the page.");
        }
        const nextVenues = loaded.map(({ venue, beverages, sections }) => ({
          ...venue,
          beverages: beverages.status === "fulfilled" ? beverages.value : [],
          sections: sections.status === "fulfilled" ? sections.value : [],
        }));
        setVenues(nextVenues);
      } catch {
        if (!cancelled) setVenueError("Venues could not be loaded. Please refresh the page.");
      } finally {
        if (!cancelled) setHydrated(true);
      }
    }

    void hydrate();
    return () => { cancelled = true; };
  }, []);

  const updateVenue = useCallback((venue: Venue) => {
    if (!isValidVenue(venue)) return false;
    setVenues((current) => {
      const next = current.map((item) => (item.id === venue.id ? venue : item));
      return next;
    });
    return true;
  }, []);

  const value = useMemo(
    () => ({ venues, hydrated, venueError, beverageError, sectionError, updateVenue }),
    [venues, hydrated, venueError, beverageError, sectionError, updateVenue],
  );

  return <VenueDataContext.Provider value={value}>{children}</VenueDataContext.Provider>;
}

export function useVenueData() {
  const context = useContext(VenueDataContext);
  if (!context) throw new Error("useVenueData must be used within VenueDataProvider");
  return context;
}

export function useVenueByName(venueName: string) {
  const { venues, ...context } = useVenueData();
  return { venue: venues.find((item) => item.venueName.toLowerCase() === venueName.toLowerCase()), ...context };
}
