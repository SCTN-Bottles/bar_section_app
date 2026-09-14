import Link from "next/link";
import { notFound } from "next/navigation";

import DemoCheckoutForm from "@/components/checkout/DemoCheckoutForm";
import VenueHeader from "@/components/layout/VenueHeader";
import { getSectionByVenueAndId } from "@/lib/venues";
import { BeverageOption } from "@/types/venue";

type CheckoutPageProps = {
  params: Promise<{
    venueName: string;
    sectionId: string;
  }>;
  searchParams: Promise<{
    date?: string;
    time?: string;
    addons?: string;
  }>;
};

type SelectedBeverage = {
  beverage: BeverageOption;
  quantity: number;
};

function formatReservationDate(value?: string) {
  if (!value) {
    return "Date TBD";
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) {
    return "Date TBD";
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getSelectedBeverages(value: string | undefined, beverages: BeverageOption[]) {
  if (!value) {
    return [];
  }

  return value.split(",").reduce<SelectedBeverage[]>((selected, entry) => {
    const [id, quantityValue] = entry.split(":");
    const beverage = beverages.find((option) => option.id === id);
    const quantity = Number(quantityValue);

    if (!beverage || !Number.isInteger(quantity) || quantity < 1) {
      return selected;
    }

    selected.push({ beverage, quantity });
    return selected;
  }, []);
}

export default async function CheckoutPage({
  params,
  searchParams,
}: CheckoutPageProps) {
  const { venueName, sectionId } = await params;
  const { date, time, addons } = await searchParams;
  const result = getSectionByVenueAndId(venueName, sectionId);

  if (!result || result.section.status !== "available") {
    notFound();
  }

  const { venue, section } = result;
  const reservationDate = formatReservationDate(date);
  const reservationTime = time ?? venue.bookingCalendar.placeholderTime;
  const selectedBeverages = getSelectedBeverages(addons, venue.beverages);
  const beverageTotal = selectedBeverages.reduce(
    (total, { beverage, quantity }) => total + beverage.price * quantity,
    0,
  );
  const remainingMinimumSpend = Math.max(0, section.minimumSpend - beverageTotal);
  const backQuery = new URLSearchParams({
    date: date ?? "",
    time: reservationTime,
    section: section.id,
    step: "drinks",
  });

  if (addons) {
    backQuery.set("addons", addons);
  }

  return (
    <>
      <VenueHeader venue={venue} />

      <section className="mx-auto max-w-5xl px-6 py-16">
        <Link
          href={`/${venue.venueName}?${backQuery.toString()}`}
          className="text-sm text-neutral-500 hover:text-foreground"
        >
          ← Back to drink selection
        </Link>

        <h1 className="display-heading mt-6">Reserve {section.name}</h1>

        <div className="mt-10 grid gap-10 lg:grid-cols-2">
          <DemoCheckoutForm maxGuests={section.capacity} />

          <aside className="rounded-xl border border-neutral-300 bg-neutral-50 p-6">
            <p className="text-sm text-neutral-500">Reservation summary</p>
            <h2 className="mt-2 text-2xl font-semibold">{venue.name}</h2>

            <div className="mt-6 space-y-4">
              <div className="flex justify-between">
                <span className="text-neutral-500">Section</span>
                <span>{section.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Date</span>
                <span className="text-right">{reservationDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Time</span>
                <span>{reservationTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Capacity</span>
                <span>Up to {section.capacity} guests</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Minimum spend</span>
                <span>${section.minimumSpend}</span>
              </div>
              <div className="border-t border-neutral-300 pt-4">
                <span className="text-neutral-500">Pre-ordered drinks</span>
                {selectedBeverages.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {selectedBeverages.map(({ beverage, quantity }) => (
                      <div key={beverage.id} className="flex justify-between gap-3">
                        <span>
                          {quantity}× {beverage.name}
                        </span>
                        <span>${beverage.price * quantity}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-neutral-300 pt-3 font-medium">
                      <span>Drink total</span>
                      <span>${beverageTotal}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500">Remaining minimum</span>
                      <span>
                        {remainingMinimumSpend === 0
                          ? "Minimum covered"
                          : `$${remainingMinimumSpend}`}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-sm">None selected</p>
                )}
              </div>
              <div className="border-t border-neutral-300 pt-4">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Deposit</span>
                  <span>${section.deposit}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
