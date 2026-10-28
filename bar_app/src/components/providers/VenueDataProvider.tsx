"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { reservations as seedReservations } from "@/data/reservations";
import { getBeverageOptions } from "@/lib/beverages";
import { getSections } from "@/lib/sections";
import { getVenues } from "@/lib/venues";
import { getDrinkSignError } from "@/lib/drink-sign";
import { BeverageOption, Reservation, Section, Venue, venueAreas } from "@/types/venue";

const reservationsStorageKey = "sctn-demo-reservations";

type VenueDataContextValue = {
  venues: Venue[];
  reservations: Reservation[];
  hydrated: boolean;
  venueError: string | null;
  beverageError: string | null;
  sectionError: string | null;
  updateVenue: (venue: Venue) => boolean;
  addReservation: (reservation: Omit<Reservation, "id" | "createdAt">) => void;
};

const VenueDataContext = createContext<VenueDataContextValue | null>(null);

function cloneSeedReservations() {
  return JSON.parse(JSON.stringify(seedReservations)) as Reservation[];
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

function isReservation(value: unknown): value is Reservation {
  if (!value || typeof value !== "object") return false;
  const reservation = value as Reservation;
  return (
    isNonEmptyString(reservation.id) &&
    isNonEmptyString(reservation.venueId) &&
    isNonEmptyString(reservation.sectionId) &&
    isNonEmptyString(reservation.sectionName) &&
    venueAreas.includes(reservation.sectionArea) &&
    isNonEmptyString(reservation.customerName) &&
    isNonEmptyString(reservation.customerEmail) &&
    Number.isInteger(reservation.guestCount) &&
    reservation.guestCount > 0 &&
    isNonEmptyString(reservation.reservationDate) &&
    isNonEmptyString(reservation.reservationTime) &&
    Array.isArray(reservation.beverages) &&
    (reservation.drinkSignText === undefined || typeof reservation.drinkSignText === "string") &&
    reservation.beverages.every((beverage) =>
      isNonEmptyString(beverage.id) &&
      isNonEmptyString(beverage.name) &&
      (beverage.type === "bottle" || beverage.type === "keg") &&
      isMoney(beverage.price) &&
      Number.isInteger(beverage.quantity) &&
      beverage.quantity > 0,
    ) &&
    isMoney(reservation.deposit) &&
    isNonEmptyString(reservation.createdAt)
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
  const [reservations, setReservations] = useState<Reservation[]>(cloneSeedReservations);
  const [hydrated, setHydrated] = useState(false);
  const [venueError, setVenueError] = useState<string | null>(null);
  const [beverageError, setBeverageError] = useState<string | null>(null);
  const [sectionError, setSectionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      let localReservations = cloneSeedReservations();
      try {
        const storedReservations = window.localStorage.getItem(reservationsStorageKey);
        if (storedReservations) {
          const parsed: unknown = JSON.parse(storedReservations);
          if (Array.isArray(parsed) && parsed.every(isReservation) && !cancelled) {
            localReservations = parsed;
          }
        }
      } catch {
        window.localStorage.removeItem(reservationsStorageKey);
      }

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
        localReservations = localReservations.map((reservation) => {
          if (reservation.venueId !== "venue-1") return reservation;
          const venue = nextVenues.find((item) => item.venueName === "myhouse");
          const section = venue?.sections.find((item) =>
            item.area === reservation.sectionArea && item.name === reservation.sectionName,
          );
          return venue ? {
            ...reservation,
            venueId: venue.id,
            sectionId: section?.id ?? reservation.sectionId,
          } : reservation;
        });
        setReservations(localReservations);
        setVenues(nextVenues.map((venue) => ({
          ...venue,
          sections: venue.sections.map((section) => localReservations.some(
            (reservation) => reservation.id.startsWith("reservation-") &&
              reservation.venueId === venue.id && reservation.sectionId === section.id,
          ) ? { ...section, status: "sold" as const } : section),
        })));
      } catch {
        if (!cancelled) setVenueError("Venues could not be loaded. Please refresh the page.");
      } finally {
        if (!cancelled) setHydrated(true);
      }
    }

    void hydrate();
    return () => { cancelled = true; };
  }, []);

  const addReservation = useCallback((reservation: Omit<Reservation, "id" | "createdAt">) => {
    const signError = getDrinkSignError(reservation.drinkSignText);
    if (signError) throw new Error(signError);
    const completeReservation: Reservation = {
      ...reservation,
      id: `reservation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    };

    setReservations((current) => {
      const next = [completeReservation, ...current];
      window.localStorage.setItem(reservationsStorageKey, JSON.stringify(next));
      return next;
    });
    setVenues((current) => {
      const next = current.map((venue) => venue.id !== reservation.venueId ? venue : {
        ...venue,
        sections: venue.sections.map((section) => section.id === reservation.sectionId ? { ...section, status: "sold" as const } : section),
      });
      return next;
    });
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
    () => ({ venues, reservations, hydrated, venueError, beverageError, sectionError, updateVenue, addReservation }),
    [venues, reservations, hydrated, venueError, beverageError, sectionError, updateVenue, addReservation],
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
