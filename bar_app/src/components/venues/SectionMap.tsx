"use client";

import { Section } from "@/types/venue";

type SectionMapProps = {
  sections: Section[];
  selectedSectionId: string;
  onSelectSection: (sectionId: string) => void;
};

export default function SectionMap({
  sections,
  selectedSectionId,
  onSelectSection,
}: SectionMapProps) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6">

      <svg
        viewBox="0 0 600 470"
        className="h-auto w-full"
        aria-label="My House section map"
      >

        {/* Main Bar */}
        <rect
          x="200"
          y="30"
          width="200"
          height="50"
          rx="8"
          className="fill-neutral-100 stroke-neutral-300"
        />

        <text
          x="300"
          y="60"
          textAnchor="middle"
          className="fill-neutral-600 text-sm"
        >
          BAR
        </text>


        {/* Dance Floor */}
        <rect
          x="205"
          y="125"
          width="190"
          height="220"
          rx="12"
          className="fill-neutral-50 stroke-neutral-300"
          strokeDasharray="6"
        />

        <text
          x="300"
          y="235"
          textAnchor="middle"
          className="fill-neutral-400 text-sm"
        >
          DANCE FLOOR
        </text>


        {/* Sections */}
        {sections.map((section) => {
          const selected =
            selectedSectionId === section.id;

          const sold =
            section.status === "sold";

          let sectionClasses =
            "fill-white stroke-neutral-400";

          if (selected) {
            sectionClasses =
              "fill-amber-100 stroke-amber-600";
          }

          if (sold) {
            sectionClasses =
              "fill-neutral-200 stroke-neutral-300";
          }

          return (
            <g
              key={section.id}
              role="button"
              tabIndex={sold ? -1 : 0}
              aria-label={`Section ${section.name}`}
              className={
                sold
                  ? "cursor-not-allowed"
                  : "cursor-pointer"
              }
              onClick={() => {
                if (!sold) {
                  onSelectSection(
                    section.id
                  );
                }
              }}
              onKeyDown={(event) => {
                if (
                  !sold &&
                  (event.key === "Enter" ||
                    event.key === " ")
                ) {
                  onSelectSection(
                    section.id
                  );
                }
              }}
            >
              <rect
                x={section.mapPosition.x}
                y={section.mapPosition.y}
                width={
                  section.mapPosition.width
                }
                height={
                  section.mapPosition.height
                }
                rx="8"
                className={sectionClasses}
                strokeWidth={
                  selected ? 3 : 2
                }
              />

              <text
                x={
                  section.mapPosition.x +
                  section.mapPosition.width /
                    2
                }
                y={
                  section.mapPosition.y +
                  section.mapPosition.height /
                    2
                }
                dominantBaseline="middle"
                textAnchor="middle"
                className="pointer-events-none fill-neutral-800 font-semibold"
              >
                {section.name}
              </text>
            </g>
          );
        })}


        {/* Entrance */}
        <text
          x="300"
          y="435"
          textAnchor="middle"
          className="fill-neutral-400 text-sm"
        >
          ENTRANCE
        </text>

      </svg>


      <div className="mt-5 flex flex-wrap gap-5 text-sm text-neutral-500">
        <span>
          White = Available
        </span>

        <span>
          Gold = Selected
        </span>

        <span>
          Gray = Sold
        </span>
      </div>

    </div>
  );
}