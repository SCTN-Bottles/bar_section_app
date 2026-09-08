"use client";

import { useState } from "react";

import SectionDetails from "@/components/venues/SectionDetails";
import SectionMap from "@/components/venues/SectionMap";
import { Venue } from "@/types/venue";

type VenueExplorerProps = {
  venue: Venue;
};

export default function VenueExplorer({
  venue,
}: VenueExplorerProps) {
  const firstAvailableSection =
    venue.sections.find(
      (section) => section.status === "available"
    );

  const [selectedSectionId, setSelectedSectionId] =
    useState(firstAvailableSection?.id ?? "");

  const selectedSection = venue.sections.find(
    (section) =>
      section.id === selectedSectionId
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
      <div>
        <SectionMap
          sections={venue.sections}
          selectedSectionId={selectedSectionId}
          onSelectSection={setSelectedSectionId}
        />
      </div>

      <div>
        <h2 className="mb-4 text-xl font-semibold">
          Available sections
        </h2>

        <div className="mb-6 space-y-3">
          {venue.sections.map((section) => (
            <button
              key={section.id}
              type="button"
              disabled={section.status === "sold"}
              onClick={() =>
                setSelectedSectionId(section.id)
              }
              className={`w-full rounded-lg border p-4 text-left ${
                selectedSectionId === section.id
                  ? "border-black bg-neutral-50"
                  : "border-neutral-200 bg-white"
              } ${
                section.status === "sold"
                  ? "cursor-not-allowed opacity-50"
                  : "hover:border-neutral-400"
              }`}
            >
              <div className="flex justify-between">
                <div>
                  <p className="font-semibold">
                    {section.name}
                  </p>

                  <p className="mt-1 text-sm text-neutral-500">
                    Up to {section.capacity} guests
                  </p>
                </div>

                <p className="font-medium">
                  ${section.minimumSpend}
                </p>
              </div>
            </button>
          ))}
        </div>

        {selectedSection && (
          <SectionDetails
            venueName={venue.name}
            section={selectedSection}
          />
        )}
      </div>
    </div>
  );
}
