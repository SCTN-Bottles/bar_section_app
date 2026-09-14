"use client";

import {
  Section,
  VenueArea,
  venueAreaLabels,
} from "@/types/venue";

type SectionMapProps = {
  area: VenueArea;
  sections: Section[];
  selectedSectionId: string;
  onSelectSection: (sectionId: string) => void;
};

function AreaFixtures({ area }: { area: VenueArea }) {
  if (area === "cabanas") {
    return (
      null
    );
  }

  if (area === "attic") {
    return (
      <>
        <rect
          x="190"
          y="120"
          width="220"
          height="100"
          rx="14"
          className="fill-neutral-200 stroke-neutral-500"
          strokeDasharray="6"
        />
        <text x="300" y="175" textAnchor="middle" className="map-label text-sm">
          DANCE FLOOR
        </text>
        <rect
          x="200"
          y="280"
          width="200"
          height="48"
          rx="8"
          className="fill-neutral-100 stroke-neutral-500"
        />
        <text x="300" y="310" textAnchor="middle" className="map-label text-sm">
          BAR
        </text>
      </>
    );
  }

  if (area === "bar") {
    return (
      <>
        <rect
          x="80"
          y="90"
          width="180"
          height="180"
          rx="10"
          className="fill-neutral-100 stroke-neutral-500"
        />
        <text x="170" y="185" textAnchor="middle" className="map-label text-sm">
          BAR
        </text>
      </>
    );
  }

  return (
    <>
      <rect
        x="200"
        y="30"
        width="200"
        height="50"
        rx="8"
        className="fill-neutral-100 stroke-neutral-500"
      />
      <text x="300" y="60" textAnchor="middle" className="map-label text-sm">
        DJ BOOTH
      </text>
      <rect
        x="205"
        y="125"
        width="190"
        height="220"
        rx="12"
        className="fill-neutral-200 stroke-neutral-500"
        strokeDasharray="6"
      />
      <text x="300" y="235" textAnchor="middle" className="map-label text-sm">
        DANCE FLOOR
      </text>
    </>
  );
}

export default function SectionMap({
  area,
  sections,
  selectedSectionId,
  onSelectSection,
}: SectionMapProps) {
  return (
    <div className="section-map self-start rounded-xl border p-6">
      <svg
        viewBox="0 0 600 360"
        className="h-auto w-full"
        aria-label={`${venueAreaLabels[area]} section map`}
      >
        <AreaFixtures area={area} />

        {sections.map((section) => {
          const selected = selectedSectionId === section.id;
          const sold = section.status === "sold";
          const sectionClasses = sold
            ? "fill-neutral-200 stroke-neutral-300"
            : selected
              ? "fill-primary stroke-primary"
              : "fill-neutral-50 stroke-neutral-500";

          return (
            <g
              key={section.id}
              role="button"
              tabIndex={sold ? -1 : 0}
              aria-disabled={sold}
              aria-label={`Section ${section.name}, ${
                sold ? "sold" : "available"
              }`}
              className={sold ? "pointer-events-none cursor-default" : "cursor-pointer"}
              onClick={() => !sold && onSelectSection(section.id)}
              onKeyDown={(event) => {
                if (!sold && (event.key === "Enter" || event.key === " ")) {
                  onSelectSection(section.id);
                }
              }}
            >
              <rect
                x={section.mapPosition.x}
                y={section.mapPosition.y}
                width={section.mapPosition.width}
                height={section.mapPosition.height}
                rx="8"
                className={sectionClasses}
                strokeWidth={selected ? 3 : 2}
              />
              <circle
                cx={section.mapPosition.x + 13}
                cy={section.mapPosition.y + 13}
                r="5"
                fill={sold ? "#dc2626" : "#238636"}
                stroke="#1f1f1f"
                strokeWidth="2"
              />
              <text
                x={section.mapPosition.x + section.mapPosition.width / 2}
                y={section.mapPosition.y + section.mapPosition.height / 2}
                dominantBaseline="middle"
                textAnchor="middle"
                className={`pointer-events-none font-semibold ${
                  selected ? "map-section-label-selected" : "map-section-label"
                }`}
              >
                {section.name}
              </text>
            </g>
          );
        })}

      </svg>

      <div className="map-legend mt-5 flex flex-wrap gap-5 text-sm">
        <span>Green dot = Available</span>
        <span>Red dot = Sold</span>
        <span>Gold = Selected</span>
      </div>
    </div>
  );
}
