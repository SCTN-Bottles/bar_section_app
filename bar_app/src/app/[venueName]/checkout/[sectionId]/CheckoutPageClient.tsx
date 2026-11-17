"use client";

import { Text } from "@astryxdesign/core/Text";
import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";


import ActionButton from "@/components/ui/ActionButton";
import { ADDITIONAL_BAND_PRICE, parseAdditionalBands } from "@/lib/additional-bands";
import Link from "next/link";
import { submitReservation } from "@/lib/reservations";
import { useState } from "react";

import DemoCheckoutForm from "@/components/checkout/DemoCheckoutForm";
import ReservationConfirmation, { type ReservationReceipt } from "@/components/checkout/ReservationConfirmation";
import VenueHeader from "@/components/layout/VenueHeader";
import { useVenueByName } from "@/components/providers/VenueDataProvider";
import { useReservationDay } from "@/lib/use-reservation-day";
import { formatBookingTime } from "@/lib/booking-time";
import { getDrinkSignError, normalizeDrinkSignText } from "@/lib/drink-sign";
import { BeverageOption, Venue } from "@/types/venue";

type CheckoutPageClientProps = {
  initialVenue: Venue;
  sectionId: string;
  date?: string;
  time?: string;
  slot?: string;
  addons?: string;
  additional_bands?: string;
  bandsChoice?: string;
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

export default function CheckoutPageClient({ initialVenue, sectionId, date, time, slot, addons, additional_bands, bandsChoice, signText }: CheckoutPageClientProps) {
  const { venue, hydrated, venueError, beverageError, sectionError } = useVenueByName(initialVenue.venueName);
  const [submissionId] = useState(() => crypto.randomUUID());
  const [receipt, setReceipt] = useState<ReservationReceipt | null>(null);
  const baseVenue = venue ?? initialVenue;
  const availableSlots = baseVenue.bookingCalendar.availableSlots ?? ["night"];
  const bookingSlot = slot === "day" && availableSlots.includes("day") ? "day" : availableSlots.includes("night") ? "night" : availableSlots[0];
  const day = useReservationDay(baseVenue.id, baseVenue.venueName, date ?? null, bookingSlot);
  const activeVenue = day.data ? { ...baseVenue, ...day.data } : baseVenue;
  const section = activeVenue.sections.find((item) => item.id === sectionId);
  const additionalBands = parseAdditionalBands(additional_bands);
  const drinkSignText = normalizeDrinkSignText(signText);
  const backQuery = new URLSearchParams({
    date: date ?? "",
    slot: bookingSlot,
    time: time ?? activeVenue.bookingCalendar.placeholderTime,
    section: sectionId,
    step: "sign",
  });
  if (additional_bands !== undefined) backQuery.set("additional_bands", additional_bands);
  if (bandsChoice) backQuery.set("bandsChoice", bandsChoice);
  if (addons) backQuery.set("addons", addons);
  if (drinkSignText) backQuery.set("signText", drinkSignText);
  const signError = getDrinkSignError(signText);

  if (receipt) return <><VenueHeader venue={baseVenue} /><ReservationConfirmation receipt={receipt} /></>;

  if (additionalBands === null) {
    backQuery.set("step", "bands");
    return <main className="mx-auto max-w-2xl space-y-4 px-6 py-16"><Text as="p" type="inherit" color="inherit" role="alert">Enter a whole number from 0 to 5 additional bands.</Text><Link className="underline" href={`/${activeVenue.venueName}?${backQuery.toString()}`}>Edit additional bands</Link></main>;
  }

  if (signError) return <main className="mx-auto max-w-2xl space-y-4 px-6 py-16">
    <Heading level={1} className="text-2xl font-semibold">Update your drink sign</Heading>
    <Text as="p" type="inherit" color="inherit" role="alert" className="text-red-700">{signError}</Text>
    <Link href={`/${activeVenue.venueName}?${backQuery.toString()}`} className="inline-block underline">Edit drink sign</Link>
  </main>;

  if (!hydrated || day.loading) {
    return <main className="mx-auto max-w-5xl px-6 py-16 text-neutral-500">Loading drink options…</main>;
  }

  if (!date || day.error) return <main className="mx-auto max-w-5xl space-y-4 px-6 py-16"><Text as="p" type="inherit" color="inherit" role="alert" className="text-red-700">{day.error || "Choose a reservation date before checking out."}</Text>{date && <ActionButton
    type="button"
    onClick={day.retry}
    variant="secondary"
    label="Retry loading date"
  />}<Link className="block underline" href={`/${activeVenue.venueName}`}>Choose a date</Link></main>;

  if (venueError || beverageError || sectionError) {
    return <main role="alert" className="mx-auto max-w-5xl px-6 py-16 text-red-700">{venueError ?? beverageError ?? sectionError}</main>;
  }

  if (!section || section.status !== "available") {
    return (
      <>
        <VenueHeader venue={activeVenue} />
        <section className="mx-auto max-w-2xl px-6 py-16">
          <VStack className="sctn-panel p-5 sm:p-6">
            <Heading level={1} className="text-2xl font-semibold">This section is no longer available</Heading>
            <Text as="p" type="inherit" color="inherit" className="mt-3 text-neutral-500">Please return to the venue and choose another section.</Text>
            <ActionButton href={`/${activeVenue.venueName}?restart=1`} variant="primary" label="Browse sections" className="mt-6" />
          </VStack>
        </section>
      </>
    );
  }

  const reservationDate = formatReservationDate(date);
  const reservationTime = section.reservationTime ?? activeVenue.bookingCalendar.placeholderTime;
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
        <Grid gap={6} className="items-start md:grid-cols-2">
          <VStack className="reservation-card sctn-panel p-5 sm:p-6">
            <ActionButton href={`/${activeVenue.venueName}?${backQuery.toString()}`} variant="ghost" label="← Back to drink sign" className="reservation-back" />
            <Text as="p" type="inherit" color="inherit" className="mt-6 reservation-step">Step 6 of 6</Text>
            <Heading level={1} className="section-heading mt-1">Reserve {section.name}</Heading>
            <VStack className="mt-6">
          <DemoCheckoutForm
            onComplete={async (details) => {

              const warning = await submitReservation(submissionId, {
                venueId: activeVenue.id,
                sectionId: section.id,
                sectionName: section.name,
                sectionArea: section.area,
                customerName: details.customerName,
                customerEmail: details.customerEmail,
                reservationDate: date ?? new Date().toISOString().slice(0, 10),
                reservationTime,
                beverages: selectedBeverages.map(({ beverage, quantity }) => ({ ...beverage, quantity })),
                drinkSignText: drinkSignText || undefined,
                additional_bands: additionalBands,
                deposit: section.deposit,
              }, bookingSlot);
              setReceipt({
                id: submissionId, venueName: activeVenue.name, sectionName: section.name,
                date: reservationDate, time: reservationTime, capacity: section.capacity,
                customerEmail: details.customerEmail, minimumSpend: section.minimumSpend,
                additional_bands: additionalBands,
                deposit: section.deposit, drinkSignText,
                beverages: selectedBeverages.map(({ beverage, quantity }) => ({ ...beverage, quantity })),
                emailWarning: warning,
              });
              window.scrollTo({ top: 0, behavior: "instant" });
            }}
          />
            </VStack>
          </VStack>
          <aside aria-label="Reservation summary" className="sctn-panel p-5 sm:p-6">
            <Text as="p" type="supporting" color="secondary" className="text-sm text-neutral-500">Reservation summary</Text>
            <Heading level={2} className="mt-2 text-2xl font-semibold">{activeVenue.name}</Heading>
            <VStack gap={4} className="mt-6">
              <SummaryRow label="Section" value={section.name} />
              <SummaryRow label="Date" value={reservationDate} />
              <SummaryRow label="Time" value={formatBookingTime(reservationTime)} />
              <SummaryRow label="Base capacity" value={`Up to ${section.capacity} guests`} />
              <SummaryRow label="Additional bands" value={`${additionalBands} × $${ADDITIONAL_BAND_PRICE} = $${additionalBands * ADDITIONAL_BAND_PRICE}`} />
              <SummaryRow label="Total guest allowance" value={`Up to ${section.capacity + additionalBands} guests`} />
              <SummaryRow label="Minimum spend" value={`$${section.minimumSpend}`} />
              <VStack className="border-t border-neutral-300 pt-4">
                <Text as="p" type="inherit" color="inherit" className="text-neutral-500">Drink sign message</Text>
                <Text as="p" type="inherit" color="inherit" className="mt-2 whitespace-pre-wrap wrap-anywhere">{drinkSignText || "No custom message"}</Text>
              </VStack>
              <VStack className="border-t border-neutral-300 pt-4">
                <Text as="span" type="inherit" color="inherit" className="text-neutral-500">Pre-ordered drinks</Text>
                {selectedBeverages.length ? (
                  <VStack gap={2} className="mt-3">
                    {selectedBeverages.map(({ beverage, quantity }) => (
                      <HStack gap={3} vAlign="stretch" key={beverage.id} className="justify-between"><Text as="span" type="inherit" color="inherit">{quantity}× {beverage.name}</Text><Text as="span" type="inherit" color="inherit">${beverage.price * quantity}</Text></HStack>
                    ))}
                    <HStack vAlign="stretch" className="justify-between border-t border-neutral-300 pt-3 font-medium"><Text as="span" type="inherit" color="inherit">Drink total</Text><Text as="span" type="inherit" color="inherit">${beverageTotal}</Text></HStack>
                    <HStack vAlign="stretch" className="justify-between text-sm"><Text as="span" type="inherit" color="inherit" className="text-neutral-500">Remaining minimum</Text><Text as="span" type="inherit" color="inherit">{remainingMinimumSpend === 0 ? "Minimum covered" : `$${remainingMinimumSpend}`}</Text></HStack>
                  </VStack>
                ) : <Text as="p" type="inherit" color="inherit" className="mt-2 text-sm">None selected</Text>}
              </VStack>
              <VStack className="sctn-total"><HStack gap={3} vAlign="stretch" className="justify-between font-semibold tabular-nums"><Text as="span" type="inherit" color="inherit">Deposit due after approval</Text><Text as="span" type="inherit" color="inherit">${section.deposit}</Text></HStack><HStack gap={3} vAlign="stretch" className="mt-3 justify-between text-lg font-semibold tabular-nums"><Text as="span" type="inherit" color="inherit">Total due after approval</Text><Text as="span" type="inherit" color="inherit">${section.deposit + additionalBands * ADDITIONAL_BAND_PRICE}</Text></HStack><Text as="p" type="supporting" color="secondary" className="mt-2 text-sm text-neutral-500">Includes additional bands. Bands do not count toward the drink minimum.</Text></VStack>
            </VStack>
          </aside>
        </Grid>
      </section>
    </>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <HStack gap={3} vAlign="stretch" className="justify-between"><Text as="span" type="inherit" color="inherit" className="text-neutral-500">{label}</Text><Text as="span" type="inherit" color="inherit" className="text-right">{value}</Text></HStack>;
}

