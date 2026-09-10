import Link from "next/link";
import { notFound } from "next/navigation";

import DemoCheckoutForm from "@/components/checkout/DemoCheckoutForm";
import VenueHeader from "@/components/layout/VenueHeader";

import {
  getSectionByVenueAndId,
} from "@/lib/venues";

type CheckoutPageProps = {
  params: Promise<{
    venueName: string;
    sectionId: string;
  }>;
};

export default async function CheckoutPage({
  params,
}: CheckoutPageProps) {

  const {
    venueName,
    sectionId,
  } = await params;


  const result =
    getSectionByVenueAndId(
      venueName,
      sectionId
    );


  if (!result) {
    notFound();
  }


  const {
    venue,
    section,
  } = result;


  if (
    section.status !== "available"
  ) {
    notFound();
  }


  return (
    <>
      <VenueHeader venue={venue} />

      <section className="mx-auto max-w-5xl px-6 py-16">

        <Link
          href={`/${venue.venueName}`}
          className="text-sm text-neutral-500 hover:text-black"
        >
          ← Back to sections
        </Link>


        <h1 className="mt-6 text-4xl font-semibold">
          Reserve {section.name}
        </h1>


        <div className="mt-10 grid gap-10 lg:grid-cols-2">


          {/* Fake form */}
          <DemoCheckoutForm
            maxGuests={
              section.capacity
            }
          />


          {/* Summary */}
          <aside className="rounded-xl border border-neutral-300 bg-neutral-50 p-6">

            <p className="text-sm text-neutral-500">
              Reservation summary
            </p>


            <h2 className="mt-2 text-2xl font-semibold">
              {venue.name}
            </h2>


            <div className="mt-6 space-y-4">


              <div className="flex justify-between">

                <span className="text-neutral-500">
                  Section
                </span>

                <span>
                  {section.name}
                </span>

              </div>


              <div className="flex justify-between">

                <span className="text-neutral-500">
                  Capacity
                </span>

                <span>
                  Up to{" "}
                  {section.capacity} guests
                </span>

              </div>


              <div className="flex justify-between">

                <span className="text-neutral-500">
                  Minimum spend
                </span>

                <span>
                  $
                  {
                    section.minimumSpend
                  }
                </span>

              </div>


              <div className="border-t border-neutral-300 pt-4">

                <div className="flex justify-between text-lg font-semibold">

                  <span>
                    Deposit
                  </span>

                  <span>
                    $
                    {section.deposit}
                  </span>

                </div>

              </div>

            </div>

          </aside>

        </div>

      </section>
    </>
  );
}