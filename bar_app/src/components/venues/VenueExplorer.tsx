"use client";

import { useEffect, useState } from "react";

import BeverageSelection, {
  BeverageQuantities,
} from "@/components/venues/BeverageSelection";
import BookingCalendar from "@/components/venues/BookingCalendar";
import DrinkSignCustomization from "@/components/venues/DrinkSignCustomization";
import ReservationAgreement from "@/components/venues/ReservationAgreement";
import SectionDetails from "@/components/venues/SectionDetails";
import SectionMap from "@/components/venues/SectionMap";
import { formatBookingTime } from "@/lib/booking-time";
import { normalizeDrinkSignText } from "@/lib/drink-sign";
import {
  Venue,
  VenueArea,
  venueAreaLabels,
  venueAreas,
} from "@/types/venue";

type VenueExplorerProps = {
  venue: Venue;
  initialReservation?: {
    date?: string;
    sectionId?: string;
    step?: string;
    addons?: string;
    signText?: string;
    restart?: string;
  };
};

type ReservationStep = "sections" | "drinks" | "sign" | "agreement";

function isBookableDate(value: string | undefined, availableWeekdays: number[]) {
  if (!value) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    Number.isInteger(day) &&
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    date >= today &&
    availableWeekdays.includes(date.getDay())
  );
}

function getBeverageQuantities(value: string | undefined, venue: Venue) {
  if (!value) {
    return {};
  }

  return value.split(",").reduce<BeverageQuantities>((quantities, entry) => {
    const [id, quantityValue] = entry.split(":");
    const quantity = Number(quantityValue);

    if (
      !venue.beverages.some((beverage) => beverage.id === id) ||
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      return quantities;
    }

    return { ...quantities, [id]: quantity };
  }, {});
}

export default function VenueExplorer({
  venue,
  initialReservation,
}: VenueExplorerProps) {
  const validDate = isBookableDate(
    initialReservation?.date,
    venue.bookingCalendar.availableWeekdays,
  )
    ? initialReservation?.date ?? null
    : null;
  const initialSection = validDate
    ? venue.sections.find(
        (section) =>
          section.id === initialReservation?.sectionId &&
          section.status === "available",
      )
    : undefined;
  const [activeArea, setActiveArea] = useState<VenueArea>(
    initialSection?.area ?? "indoor",
  );
  const [bookingDate, setBookingDate] = useState<string | null>(validDate);
  const [selectedSectionId, setSelectedSectionId] = useState(
    initialSection?.id ?? "",
  );
  const [reservationStep, setReservationStep] = useState<ReservationStep>(
    initialSection && (initialReservation?.step === "drinks" || initialReservation?.step === "sign" || initialReservation?.step === "agreement")
      ? initialReservation.step
      : "sections",
  );
  const [beverageQuantities, setBeverageQuantities] = useState<BeverageQuantities>(
    () => getBeverageQuantities(initialReservation?.addons, venue),
  );
  const [drinkSignText, setDrinkSignText] = useState(
    () => normalizeDrinkSignText(initialReservation?.signText),
  );

  useEffect(() => {
    if (reservationStep !== "sections") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [reservationStep]);

  function getFirstAvailableSectionId(area: VenueArea) {
    return venue.sections.find(
      (section) => section.area === area && section.status === "available",
    )?.id ?? "";
  }

  const activeSections = venue.sections.filter(
    (section) => section.area === activeArea,
  );
  const selectedSection = activeSections.find(
    (section) => section.id === selectedSectionId,
  );

  function changeArea(area: VenueArea) {
    setActiveArea(area);
    setSelectedSectionId(getFirstAvailableSectionId(area));
  }

  function chooseBookingDate(date: string) {
    setBookingDate(date);
    setSelectedSectionId(getFirstAvailableSectionId(activeArea));
    setBeverageQuantities({});
    setDrinkSignText("");
    setReservationStep("sections");
  }

  function changeBookingDate() {
    setBookingDate(null);
    setSelectedSectionId("");
    setBeverageQuantities({});
    setDrinkSignText("");
    setReservationStep("sections");
  }

  if (!bookingDate) {
    return (
      <div className="flex min-h-96 items-center justify-center py-8">
        <BookingCalendar
          value={null}
          onChange={chooseBookingDate}
          availableWeekdays={venue.bookingCalendar.availableWeekdays}
          placeholderTime={venue.bookingCalendar.placeholderTime}
        />
      </div>
    );
  }

  const bookingDateLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(`${bookingDate}T00:00:00`));

  const addons = Object.entries(beverageQuantities)
    .map(([id, quantity]) => `${id}:${quantity}`)
    .join(",");
  const checkoutQuery = new URLSearchParams({
    date: bookingDate,
    time: venue.bookingCalendar.placeholderTime,
    addons,
  });
  const signText = normalizeDrinkSignText(drinkSignText);
  if (signText) checkoutQuery.set("signText", signText);

  if (reservationStep === "drinks" && selectedSection) {
    return (
      <BeverageSelection
        beverages={venue.beverages}
        section={selectedSection}
        bookingDate={bookingDate}
        bookingTime={venue.bookingCalendar.placeholderTime}
        quantities={beverageQuantities}
        onChangeQuantities={setBeverageQuantities}
        onBack={() => setReservationStep("sections")}
        onContinue={() => setReservationStep("sign")}
      />
    );
  }

  if (reservationStep === "sign" && selectedSection) {
    return (
      <DrinkSignCustomization
        text={drinkSignText}
        onChangeText={setDrinkSignText}
        onBack={() => setReservationStep("drinks")}
        onContinue={() => setReservationStep("agreement")}
      />
    );
  }

  if (reservationStep === "agreement" && selectedSection) {
    return (
      <ReservationAgreement
        onBack={() => setReservationStep("sign")}
        checkoutHref={`/${venue.venueName}/checkout/${selectedSection.id}?${checkoutQuery.toString()}`}
      />
    );
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-300 bg-neutral-50 px-4 py-3">
        <div>
          <p className="text-sm text-neutral-500">Reservation date</p>
          <p className="mt-1 font-semibold">
            {bookingDateLabel} · {formatBookingTime(venue.bookingCalendar.placeholderTime)}
          </p>
        </div>

        <button
          type="button"
          onClick={changeBookingDate}
          className="rounded-md border border-primary bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-accent"
        >
          Change date
        </button>
      </div>

      <div
        className="mb-6 flex flex-wrap gap-2"
        role="tablist"
        aria-label="Reservation areas"
      >
        {venueAreas.map((area) => {
          const isActive = area === activeArea;

          return (
            <button
              key={area}
              id={`${area}-tab`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls="area-sections-panel"
              onClick={() => changeArea(area)}
              className={`rounded-md border px-4 py-2 text-sm font-semibold ${
                isActive
                  ? "border-primary bg-primary text-on-primary hover:bg-accent"
                  : "border-neutral-300 bg-neutral-50 hover:border-primary"
              }`}
            >
              {venueAreaLabels[area]}
            </button>
          );
        })}
      </div>

      <div
        id="area-sections-panel"
        role="tabpanel"
        aria-labelledby={`${activeArea}-tab`}
        className="grid items-start gap-8 lg:grid-cols-[1.5fr_1fr]"
      >
        <SectionMap
          area={activeArea}
          sections={activeSections}
          selectedSectionId={selectedSectionId}
          onSelectSection={setSelectedSectionId}
        />

        <div>
          <h2 className="section-heading mb-4 text-foreground">
            {venueAreaLabels[activeArea]}
          </h2>

          {selectedSection && (
            <SectionDetails
              venueName={venue.venueName}
              section={selectedSection}
              bookingDate={bookingDate}
              bookingTime={venue.bookingCalendar.placeholderTime}
              onReserve={() => setReservationStep("drinks")}
            />
          )}
        </div>

      </div>
    </>
  );
}
