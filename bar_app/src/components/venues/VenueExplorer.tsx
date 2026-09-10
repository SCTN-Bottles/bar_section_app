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
      (section) =>
        section.status === "available"
    );


  const [
    selectedSectionId,
    setSelectedSectionId,
  ] = useState(
    firstAvailableSection?.id ?? ""
  );


  const selectedSection =
    venue.sections.find(
      (section) =>
        section.id === selectedSectionId
    );


  return (
    <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">

      {/* Left side */}
      <div>
        <SectionMap
          sections={venue.sections}
          selectedSectionId={
            selectedSectionId
          }
          onSelectSection={
            setSelectedSectionId
          }
        />
      </div>


      {/* Right side */}
      <div>

        <h2 className="mb-4 text-xl font-semibold text-black">
          Sections
        </h2>


        <div className="mb-6 space-y-3">

          {venue.sections.map(
            (section) => {

              const selected =
                selectedSectionId ===
                section.id;

              const sold =
                section.status === "sold";


              return (
                <button
                  key={section.id}
                  type="button"
                  disabled={sold}
                  onClick={() =>
                    setSelectedSectionId(
                      section.id
                    )
                  }
                  className={`
                    w-full rounded-lg border
                    p-4 text-left

                    ${
                      selected
                        ? "border-black bg-neutral-50"
                        : "border-neutral-300 bg-neutral-50"
                    }

                    ${
                      sold
                        ? "cursor-not-allowed opacity-50"
                        : "hover:border-neutral-500"
                    }
                  `}
                >

                  <div className="flex justify-between">

                    <div>
                      <p className="font-semibold">
                        {section.name}
                      </p>

                      <p className="mt-1 text-sm text-neutral-500">
                        Up to{" "}
                        {section.capacity}{" "}
                        guests
                      </p>
                    </div>


                    <div className="text-right">

                      <p className="font-medium">
                        $
                        {
                          section.minimumSpend
                        }
                      </p>

                      <p className="mt-1 text-xs text-neutral-500">
                        {sold
                          ? "Sold"
                          : "Available"}
                      </p>

                    </div>

                  </div>

                </button>
              );
            }
          )}

        </div>


        {selectedSection && (
          <SectionDetails
            venueName={venue.venueName}
            section={selectedSection}
          />
        )}

      </div>

    </div>
  );
}
