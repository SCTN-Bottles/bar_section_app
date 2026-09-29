"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { reservations as seedReservations } from "@/data/reservations";
import { venues as seedVenues } from "@/data/venues";
import { BeverageOption, Reservation, Section, Venue, venueAreas } from "@/types/venue";

const storageKey = "sectn-demo-venues";
const reservationsStorageKey = "sectn-demo-reservations";

type VenueDataContextValue = {
  venues: Venue[];
  reservations: Reservation[];
  hydrated: boolean;
  updateVenue: (venue: Venue) => boolean;
  addReservation: (reservation: Omit<Reservation, "id" | "createdAt">) => void;
  resetVenues: () => void;
};

const VenueDataContext = createContext<VenueDataContextValue | null>(null);

function cloneSeedVenues() {
  return JSON.parse(JSON.stringify(seedVenues)) as Venue[];
}

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
  const [reservations, setReservations] = useState<Reservation[]>(cloneSeedReservations);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (isValidVenueList(parsed)) setVenues(parsed);
      }
      const storedReservations = window.localStorage.getItem(reservationsStorageKey);
      if (storedReservations) {
        const parsed: unknown = JSON.parse(storedReservations);
        if (Array.isArray(parsed) && parsed.every(isReservation)) setReservations(parsed);
      }
    } catch {
      window.localStorage.removeItem(storageKey);
      window.localStorage.removeItem(reservationsStorageKey);
    } finally {
      setHydrated(true);
    }
  }, []);

  const addReservation = useCallback((reservation: Omit<Reservation, "id" | "createdAt">) => {
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
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
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
    setReservations(cloneSeedReservations());
    window.localStorage.removeItem(storageKey);
    window.localStorage.removeItem(reservationsStorageKey);
  }, []);

  const value = useMemo(
    () => ({ venues, reservations, hydrated, updateVenue, addReservation, resetVenues }),
    [venues, reservations, hydrated, updateVenue, addReservation, resetVenues],
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
