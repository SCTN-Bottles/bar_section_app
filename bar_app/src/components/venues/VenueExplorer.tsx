"use client";

import { useEffect, useState } from "react";

import BeverageSelection, {
  BeverageQuantities,
} from "@/components/venues/BeverageSelection";
import AdditionalBandsSelection, { type BandChoice } from "@/components/venues/AdditionalBandsSelection";
import { parseAdditionalBands } from "@/lib/additional-bands";
import BookingCalendar from "@/components/venues/BookingCalendar";
import DrinkSignCustomization from "@/components/venues/DrinkSignCustomization";
import ReservationAgreement from "@/components/venues/ReservationAgreement";
import SectionDetails from "@/components/venues/SectionDetails";
import { getReservationSections } from "@/lib/sections";
import SectionMap from "@/components/venues/SectionMap";
import { useReservationDay } from "@/lib/use-reservation-day";
import { formatBookingTime } from "@/lib/booking-time";
import { getDrinkSignError, normalizeDrinkSignText } from "@/lib/drink-sign";
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
    slot?: string;
    sectionId?: string;
    step?: string;
    addons?: string;
    signText?: string;
    restart?: string;
    additional_bands?: string;
    bandsChoice?: string;
  };
};

type ReservationStep = "sections" | "bands" | "drinks" | "sign" | "agreement";

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

function getBeverageQuantities(value: string | undefined) {
  if (!value) {
    return {};
  }

  return value.split(",").reduce<BeverageQuantities>((quantities, entry) => {
    const [id, quantityValue] = entry.split(":");
    const quantity = Number(quantityValue);

    if (
      !id ||
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      return quantities;
    }

    return { ...quantities, [id]: quantity };
  }, {});
}

export default function VenueExplorer({
  venue: initialVenue,
  initialReservation,
}: VenueExplorerProps) {
  const validDate = isBookableDate(
    initialReservation?.date,
    initialVenue.bookingCalendar.availableWeekdays,
  )
    ? initialReservation?.date ?? null
    : null;
  const initialSection = validDate
    ? initialVenue.sections.find(
        (section) =>
          section.id === initialReservation?.sectionId,
      )
    : undefined;
  const [activeArea, setActiveArea] = useState<VenueArea>(
    initialSection?.area ?? "indoor",
  );
  const [bookingDate, setBookingDate] = useState<string | null>(validDate);
  const [selectedSectionId, setSelectedSectionId] = useState(
    initialSection?.id ?? "",
  );
  const initialBands = parseAdditionalBands(initialReservation?.additional_bands);
  const [bandChoice, setBandChoice] = useState<BandChoice>(initialSection && initialBands !== null
    ? initialReservation?.bandsChoice === "yes" || (initialBands > 0) ? "yes" : initialReservation?.bandsChoice === "no" ? "no" : null
    : null);
  const [bandQuantity, setBandQuantity] = useState(String(initialBands ?? 0));
  const additionalBands = bandChoice === "yes" ? Number(bandQuantity) : 0;
  function resetBands() { setBandChoice(null); setBandQuantity("0"); }
  function chooseSection(id: string) {
    if (id !== selectedSectionId) resetBands();
    setSelectedSectionId(id);
  }
  const [reservationStep, setReservationStep] = useState<ReservationStep>(
    initialSection && (initialReservation?.step === "bands" || initialReservation?.step === "drinks" || initialReservation?.step === "sign" || initialReservation?.step === "agreement")
      ? initialBands === null ? "bands" : initialReservation.step
      : "sections",
  );
  const [beverageQuantities, setBeverageQuantities] = useState<BeverageQuantities>(
    () => getBeverageQuantities(initialReservation?.addons),
  );
  const [drinkSignText, setDrinkSignText] = useState(
    () => normalizeDrinkSignText(initialReservation?.signText),
  );

  const availableSlots = initialVenue.bookingCalendar.availableSlots ?? ["night"];
  const [bookingSlot, setBookingSlot] = useState<"day" | "night">(initialReservation?.slot === "day" && availableSlots.includes("day") ? "day" : availableSlots.includes("night") ? "night" : availableSlots[0]);
  const day = useReservationDay(initialVenue.id, initialVenue.venueName, bookingDate, bookingSlot);
  const venue = day.data ? { ...initialVenue, ...day.data } : initialVenue;

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
    (section) => section.id === selectedSectionId && section.status === "available",
  ) ?? (reservationStep === "sections" ? activeSections.find((section) => section.status === "available") : undefined);
  const bookingTime = selectedSection?.reservationTime ?? venue.bookingCalendar.placeholderTime;

  async function continueReservation(next: ReservationStep) {
    if (!bookingDate || !selectedSection) return;
    try {
      const sections = await getReservationSections(venue.id, bookingDate, bookingSlot);
      if (!sections.some((section) => section.id === selectedSection.id && section.status === "available")) {
        window.alert("This section has just been reserved. Please choose another section.");
        setSelectedSectionId("");
        setReservationStep("sections");
        day.retry();
        return;
      }
      setSelectedSectionId(selectedSection.id);
      setReservationStep(next);
    } catch {
      window.alert("Availability could not be checked. Please try again.");
    }
  }
  function changeArea(area: VenueArea) {
    if (area !== activeArea) resetBands();
    setActiveArea(area);
    setSelectedSectionId(getFirstAvailableSectionId(area));
  }

  function chooseBookingDate(date: string) {
    resetBands();
    setBookingDate(date);
    setSelectedSectionId(getFirstAvailableSectionId(activeArea));
    setBeverageQuantities({});
    setDrinkSignText("");
    setReservationStep("sections");
  }

  function changeBookingDate() {
    resetBands();
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

  if (day.loading || !day.data && !day.error) return <p role="status" className="py-12 text-neutral-500">Loading sections and drinks for {bookingDate}…</p>;
  if (day.error) return <div className="space-y-4 py-8"><p role="alert" className="text-red-700">{day.error}</p><button type="button" onClick={day.retry} className="rounded-md border px-4 py-2">Retry loading date</button><button type="button" onClick={changeBookingDate} className="ml-3 rounded-md border px-4 py-2">Change date</button></div>;

  const bookingDateLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(`${bookingDate}T00:00:00`));
  const hasSections = venue.sections.length > 0;

  if (reservationStep !== "sections" && !selectedSection) {
    return <div role="alert" className="space-y-4 py-8">
      <p>This section has just been reserved. Please choose another section.</p>
      <button type="button" onClick={() => { setSelectedSectionId(""); setReservationStep("sections"); }} className="rounded-md border px-4 py-2">Browse sections</button>
    </div>;
  }
  const activeBeverageQuantities = Object.fromEntries(Object.entries(beverageQuantities)
    .filter(([id]) => venue.beverages.some((beverage) => beverage.id === id)));
  const addons = Object.entries(activeBeverageQuantities)
    .map(([id, quantity]) => `${id}:${quantity}`)
    .join(",");
  const checkoutQuery = new URLSearchParams({
    date: bookingDate,
    time: bookingTime,
    slot: bookingSlot,
    addons,
    additional_bands: String(additionalBands),
    bandsChoice: bandChoice ?? "",
  });
  const signText = normalizeDrinkSignText(drinkSignText);
  if (signText) checkoutQuery.set("signText", signText);

  if (reservationStep === "bands" && selectedSection) {
    return <AdditionalBandsSelection section={selectedSection} choice={bandChoice} quantity={bandQuantity}
      onChoice={(choice) => {
        if (choice !== bandChoice) {
          setBandChoice(choice);
          setBandQuantity(choice === "yes" ? "1" : "0");
        }
        if (choice === "no") void continueReservation("drinks");
      }}
      onQuantity={setBandQuantity} onBack={() => setReservationStep("sections")}
      onContinue={() => void continueReservation("drinks")} />;
  }

  if (reservationStep === "drinks" && selectedSection) {
    return (
      <BeverageSelection
        beverages={venue.beverages}
        section={selectedSection}
        bookingDate={bookingDate}
        bookingTime={bookingTime}
        additionalBands={additionalBands}
        quantities={activeBeverageQuantities}
        onChangeQuantities={setBeverageQuantities}
        onBack={() => setReservationStep("bands")}
        onContinue={() => void continueReservation("sign")}
      />
    );
  }

  if ((reservationStep === "sign" || (reservationStep === "agreement" && getDrinkSignError(drinkSignText))) && selectedSection) {
    return (
      <DrinkSignCustomization
        text={drinkSignText}
        onChangeText={setDrinkSignText}
        onBack={() => setReservationStep("drinks")}
        onContinue={() => { if (!getDrinkSignError(drinkSignText)) void continueReservation("agreement"); }}
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
            {bookingDateLabel}{hasSections && ` · ${formatBookingTime(bookingTime)}`}
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

      {availableSlots.length > 1 && <div className="mb-6 flex gap-2" aria-label="Reservation period">{availableSlots.map((slot) => <button key={slot} type="button" aria-pressed={bookingSlot === slot} onClick={() => { resetBands(); setBookingSlot(slot); setSelectedSectionId(""); setBeverageQuantities({}); setReservationStep("sections"); }} className={`rounded-md border px-4 py-2 ${bookingSlot === slot ? "bg-primary text-on-primary" : "border-neutral-300"}`}>{slot === "day" ? "Daytime" : "Nighttime"}</button>)}</div>}
      {!hasSections ? (
        <p role="status" className="rounded-xl border border-neutral-300 bg-neutral-50 px-4 py-8 text-center text-neutral-600">
          {availableSlots.length > 1
            ? `No bookings have been created for the selected date during the ${bookingSlot === "day" ? "daytime" : "nighttime"} period.`
            : "No bookings have been created for the selected date."}
        </p>
      ) : (
        <>
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
              selectedSectionId={selectedSection?.id ?? ""}
              onSelectSection={chooseSection}
            />

            <div>
              <h2 className="section-heading mb-4 text-foreground">
                {venueAreaLabels[activeArea]}
              </h2>

              {!selectedSection && <p className="text-sm text-neutral-500">No sections are available in this area for the selected date.</p>}
              {selectedSection && (
                <SectionDetails
                  venueName={venue.venueName}
                  section={selectedSection}
                  bookingDate={bookingDate}
                  bookingTime={bookingTime}
                  onReserve={() => void continueReservation("bands")}
                />
              )}
            </div>

          </div>
        </>
      )}
    </>
  );
}
