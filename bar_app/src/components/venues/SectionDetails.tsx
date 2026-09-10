import Link from "next/link";

import { Section } from "@/types/venue";

type SectionDetailsProps = {
  venueName: string;
  section: Section;
};

export default function SectionDetails({
  venueName,
  section,
}: SectionDetailsProps) {
  return (
    <div className="rounded-xl border border-neutral-300 bg-neutral-50 p-6">

      <div className="flex items-start justify-between">

        <div>
          <p className="text-sm text-neutral-500">
            Selected section
          </p>

          <h2 className="mt-1 text-3xl font-semibold">
            {section.name}
          </h2>
        </div>

        <span className="rounded-full bg-green-50 px-3 py-1 text-sm text-green-700">
          Available
        </span>

      </div>


      {/* Placeholder for real section photo */}
      <div className="my-6 flex h-48 items-center justify-center rounded-lg bg-neutral-100 text-neutral-400">
        Section photo
      </div>


      <p className="text-neutral-600">
        {section.description}
      </p>


      <dl className="mt-6 space-y-4">

        <div className="flex justify-between">
          <dt className="text-neutral-500">
            Capacity
          </dt>

          <dd className="font-medium">
            Up to {section.capacity} guests
          </dd>
        </div>


        <div className="flex justify-between">
          <dt className="text-neutral-500">
            Minimum spend
          </dt>

          <dd className="font-medium">
            ${section.minimumSpend}
          </dd>
        </div>


        <div className="flex justify-between">
          <dt className="text-neutral-500">
            Deposit
          </dt>

          <dd className="font-medium">
            ${section.deposit}
          </dd>
        </div>

      </dl>


      <Link
        href={`/${venueName}/checkout/${section.id}`}
        className="mt-8 block rounded-lg bg-black px-5 py-3 text-center font-medium text-white hover:bg-neutral-800"
      >
        Reserve section
      </Link>

    </div>
  );
}