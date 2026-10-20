"use client";

import Link from "next/link";
import { useState } from "react";

import DemoCheckoutForm from "@/components/checkout/DemoCheckoutForm";
import VenueHeader from "@/components/layout/VenueHeader";
import { useVenueByName } from "@/components/providers/VenueDataProvider";
import { formatBookingTime } from "@/lib/booking-time";
import { normalizeDrinkSignText } from "@/lib/drink-sign";
import { BeverageOption, Venue } from "@/types/venue";

type CheckoutPageClientProps = {
  initialVenue: Venue;
  sectionId: string;
  date?: string;
  time?: string;
  addons?: string;
  signText?: string;
};

type SelectedBeverage = { beverage: BeverageOption; quantity: number };

function formatReservationDate(value?: string) {
  if (!value) return "Date TBD";
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return "Date TBD";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getSelectedBeverages(value: string | undefined, beverages: BeverageOption[]) {
  if (!value) return [];
  return value.split(",").reduce<SelectedBeverage[]>((selected, entry) => {
    const [id, quantityValue] = entry.split(":");
    const beverage = beverages.find((option) => option.id === id);
    const quantity = Number(quantityValue);
    if (beverage && Number.isInteger(quantity) && quantity > 0) {
      selected.push({ beverage, quantity });
    }
    return selected;
  }, []);
}

export default function CheckoutPageClient({ initialVenue, sectionId, date, time, addons, signText }: CheckoutPageClientProps) {
  const { venue, addReservation } = useVenueByName(initialVenue.venueName);
  const [reservationComplete, setReservationComplete] = useState(false);
  const activeVenue = venue ?? initialVenue;
  const section = activeVenue.sections.find((item) => item.id === sectionId);
  const drinkSignText = normalizeDrinkSignText(signText);
  const backQuery = new URLSearchParams({
    date: date ?? "",
    time: time ?? activeVenue.bookingCalendar.placeholderTime,
    section: sectionId,
    step: "sign",
  });
  if (addons) backQuery.set("addons", addons);
  if (drinkSignText) backQuery.set("signText", drinkSignText);

  if (!section || (section.status !== "available" && !reservationComplete)) {
    return (
      <>
        <VenueHeader venue={activeVenue} />
        <section className="mx-auto max-w-2xl px-6 py-16">
          <div className="rounded-xl border border-neutral-300 bg-neutral-50 p-6">
            <h1 className="text-2xl font-semibold">This section is no longer available</h1>
            <p className="mt-3 text-neutral-500">Please return to the venue and choose another section.</p>
            <Link href={`/${activeVenue.venueName}?restart=1`} className="mt-6 inline-block rounded-md bg-primary px-5 py-3 font-medium text-on-primary hover:bg-accent">
              Browse sections
            </Link>
          </div>
        </section>
      </>
    );
  }

  const reservationDate = formatReservationDate(date);
  const reservationTime = time ?? activeVenue.bookingCalendar.placeholderTime;
  const selectedBeverages = getSelectedBeverages(addons, activeVenue.beverages);
  const beverageTotal = selectedBeverages.reduce(
    (total, { beverage, quantity }) => total + beverage.price * quantity,
    0,
  );
  const remainingMinimumSpend = Math.max(0, section.minimumSpend - beverageTotal);

  return (
    <>
      <VenueHeader venue={activeVenue} />
      <section className="mx-auto max-w-5xl px-6 py-16">
        <Link href={`/${activeVenue.venueName}?${backQuery.toString()}`} className="text-sm text-neutral-500 hover:text-foreground">← Back to drink sign</Link>
        <p className="mt-6 text-sm text-neutral-500">Step 5 of 5</p>
        <h1 className="display-heading mt-2">Reserve {section.name}</h1>
        <div className="mt-10 grid gap-10 lg:grid-cols-2">
          <DemoCheckoutForm
            maxGuests={section.capacity}
            onComplete={(details) => {
              setReservationComplete(true);
              addReservation({
                venueId: activeVenue.id,
                sectionId: section.id,
                sectionName: section.name,
                sectionArea: section.area,
                customerName: details.customerName,
                customerEmail: details.customerEmail,
                guestCount: details.guestCount,
                reservationDate: date ?? new Date().toISOString().slice(0, 10),
                reservationTime,
                beverages: selectedBeverages.map(({ beverage, quantity }) => ({ ...beverage, quantity })),
                drinkSignText: drinkSignText || undefined,
                deposit: section.deposit,
              });
            }}
          />
          <aside className="rounded-xl border border-neutral-300 bg-neutral-50 p-6">
            <p className="text-sm text-neutral-500">Reservation summary</p>
            <h2 className="mt-2 text-2xl font-semibold">{activeVenue.name}</h2>
            <div className="mt-6 space-y-4">
              <SummaryRow label="Section" value={section.name} />
              <SummaryRow label="Date" value={reservationDate} />
              <SummaryRow label="Time" value={formatBookingTime(reservationTime)} />
              <SummaryRow label="Capacity" value={`Up to ${section.capacity} guests`} />
              <SummaryRow label="Minimum spend" value={`$${section.minimumSpend}`} />
              <div className="border-t border-neutral-300 pt-4">
                <p className="text-neutral-500">Drink sign message</p>
                <p className="mt-2 whitespace-pre-wrap [overflow-wrap:anywhere]">{drinkSignText || "No custom message"}</p>
              </div>
              <div className="border-t border-neutral-300 pt-4">
                <span className="text-neutral-500">Pre-ordered drinks</span>
                {selectedBeverages.length ? (
                  <div className="mt-3 space-y-2">
                    {selectedBeverages.map(({ beverage, quantity }) => (
                      <div key={beverage.id} className="flex justify-between gap-3"><span>{quantity}× {beverage.name}</span><span>${beverage.price * quantity}</span></div>
                    ))}
                    <div className="flex justify-between border-t border-neutral-300 pt-3 font-medium"><span>Drink total</span><span>${beverageTotal}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-neutral-500">Remaining minimum</span><span>{remainingMinimumSpend === 0 ? "Minimum covered" : `$${remainingMinimumSpend}`}</span></div>
                  </div>
                ) : <p className="mt-2 text-sm">None selected</p>}
              </div>
              <div className="border-t border-neutral-300 pt-4"><div className="flex justify-between text-lg font-semibold"><span>Deposit</span><span>${section.deposit}</span></div></div>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3"><span className="text-neutral-500">{label}</span><span className="text-right">{value}</span></div>;
}
