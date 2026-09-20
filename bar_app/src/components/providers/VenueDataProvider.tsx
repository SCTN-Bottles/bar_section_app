"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { venues as seedVenues } from "@/data/venues";
import { BeverageOption, Section, Venue, venueAreas } from "@/types/venue";

const storageKey = "sectn-demo-venues";

type VenueDataContextValue = {
  venues: Venue[];
  hydrated: boolean;
  updateVenue: (venue: Venue) => boolean;
  resetVenues: () => void;
};

const VenueDataContext = createContext<VenueDataContextValue | null>(null);

function cloneSeedVenues() {
  return JSON.parse(JSON.stringify(seedVenues)) as Venue[];
}

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

function isValidVenueList(value: unknown): value is Venue[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(isValidVenue) &&
    new Set(value.map((venue) => venue.id)).size === value.length
  );
}

export default function VenueDataProvider({ children }: { children: React.ReactNode }) {
  const [venues, setVenues] = useState<Venue[]>(cloneSeedVenues);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (isValidVenueList(parsed)) setVenues(parsed);
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    } finally {
      setHydrated(true);
    }
  }, []);

  const updateVenue = useCallback((venue: Venue) => {
    if (!isValidVenue(venue)) return false;
    setVenues((current) => {
      const next = current.map((item) => (item.id === venue.id ? venue : item));
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
    return true;
  }, []);

  const resetVenues = useCallback(() => {
    const next = cloneSeedVenues();
    setVenues(next);
    window.localStorage.removeItem(storageKey);
  }, []);

  const value = useMemo(
    () => ({ venues, hydrated, updateVenue, resetVenues }),
    [venues, hydrated, updateVenue, resetVenues],
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
  return { venue: venues.find((item) => item.venueName === venueName), ...context };
}
