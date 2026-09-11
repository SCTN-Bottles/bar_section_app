"use client";

import { useState } from "react";

import BookingCalendar from "@/components/venues/BookingCalendar";
import SectionDetails from "@/components/venues/SectionDetails";
import SectionMap from "@/components/venues/SectionMap";
import {
  Venue,
  VenueArea,
  venueAreaLabels,
  venueAreas,
} from "@/types/venue";

type VenueExplorerProps = {
  venue: Venue;
};

export default function VenueExplorer({ venue }: VenueExplorerProps) {
  const [activeArea, setActiveArea] = useState<VenueArea>("indoor");
  const [bookingDate, setBookingDate] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState("");

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
  }

  function changeBookingDate() {
    setBookingDate(null);
    setSelectedSectionId("");
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

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-300 bg-neutral-50 px-4 py-3">
        <div>
          <p className="text-sm text-neutral-500">Reservation date</p>
          <p className="mt-1 font-semibold">
            {bookingDateLabel} · {venue.bookingCalendar.placeholderTime}
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

          <div className="mb-6 space-y-3">
            {activeSections.map((section) => {
              const selected = selectedSectionId === section.id;
              const sold = section.status === "sold";

              return (
                <button
                  key={section.id}
                  type="button"
                  disabled={sold}
                  onClick={() => setSelectedSectionId(section.id)}
                  className={`w-full rounded-md border p-4 text-left ${
                    selected
                      ? "border-primary bg-neutral-50"
                      : "border-neutral-300 bg-neutral-50"
                  } ${
                    sold
                      ? "cursor-not-allowed opacity-50"
                      : "hover:border-primary"
                  }`}
                >
                  <div className="flex justify-between">
                    <div>
                      <p className="flex items-center gap-2 font-semibold">
                        <span
                          aria-hidden="true"
                          className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                            sold ? "bg-red-500" : "bg-green-500"
                          }`}
                        />
                        {section.name}
                      </p>
                      <p className="mt-1 text-sm text-neutral-500">
                        Up to {section.capacity} guests
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-medium">${section.minimumSpend}</p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {sold ? "Sold" : "Available"}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {selectedSection && (
            <SectionDetails
              venueName={venue.venueName}
              section={selectedSection}
              bookingDate={bookingDate}
              bookingTime={venue.bookingCalendar.placeholderTime}
            />
          )}
        </div>
      </div>
    </>
  );
}
