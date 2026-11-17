
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Heading } from "@astryxdesign/core/Heading";

import ActionButton from "@/components/ui/ActionButton";
import { ADDITIONAL_BAND_PRICE } from "@/lib/additional-bands";
import { formatBookingTime } from "@/lib/booking-time";

export type ReservationReceipt = {
  id: string;
  venueName: string;
  sectionName: string;
  date: string;
  time: string;
  capacity: number;
  customerEmail: string;
  minimumSpend: number;
  deposit: number;
  additional_bands: number;
  drinkSignText: string;
  beverages: { id: string; name: string; quantity: number; price: number }[];
  emailWarning?: string;
};

export default function ReservationConfirmation({ receipt }: { receipt: ReservationReceipt }) {
  const bands = receipt.additional_bands ?? 0;
  return <main className="mx-auto max-w-2xl px-6 py-16">
    <section className="sctn-panel p-5 sm:p-7">
      <Heading level={1} className="section-heading">Reservation submitted</Heading>
      <Heading level={2} className="mt-6 text-xl font-semibold">Section summary</Heading>
      <dl className="sctn-inset mt-4 space-y-3 p-4 tabular-nums">
        {[
          ["Venue", receipt.venueName], ["Section", receipt.sectionName],
          ["Date", receipt.date], ["Time", formatBookingTime(receipt.time)],
          ["Section capacity", String(receipt.capacity)], ["Minimum spend", `$${receipt.minimumSpend}`],
          ["Additional bands", `${bands} × $${ADDITIONAL_BAND_PRICE} = $${bands * ADDITIONAL_BAND_PRICE}`],
          ["Total guest allowance", `Up to ${receipt.capacity + bands} guests`],
          ["Deposit due after approval", `$${receipt.deposit}`],
          ["Total due after approval", `$${receipt.deposit + bands * ADDITIONAL_BAND_PRICE}`],
        ].map(([label, value]) => <HStack gap={4} vAlign="stretch" key={label} className="justify-between"><dt className="text-neutral-500">{label}</dt><dd className="text-right">{value}</dd></HStack>)}
      </dl>
      <VStack className="mt-5 border-t border-neutral-300 pt-4">
        <Text as="p" type="inherit" color="inherit" className="text-neutral-500">Pre-ordered drinks</Text>
        {receipt.beverages.length ? <ul className="mt-2 space-y-2">{receipt.beverages.map((drink) => <li key={drink.id} className="flex justify-between gap-4"><Text as="span" type="inherit" color="inherit">{drink.quantity} × {drink.name}</Text><Text as="span" type="inherit" color="inherit">${drink.price * drink.quantity}</Text></li>)}</ul> : <Text as="p" type="inherit" color="inherit" className="mt-2">None selected</Text>}
        <Text as="p" type="inherit" color="inherit" className="mt-4 text-neutral-500">Drink sign message</Text>
        <Text as="p" type="inherit" color="inherit" className="mt-2 whitespace-pre-wrap wrap-anywhere">{receipt.drinkSignText || "No custom message"}</Text>
      </VStack>
      <Text as="p" type="supporting" color="secondary" className="mt-5 break-all text-sm text-neutral-500">Reservation number: {receipt.id}</Text>
      <VStack className="mt-6 border-t border-neutral-300 pt-5">
        {receipt.emailWarning ? <Text as="p" type="inherit" color="inherit" role="alert">Your reservation was submitted, but we could not confirm email delivery. {receipt.emailWarning}</Text> : <Text as="p" type="inherit" color="inherit" role="status" className="wrap-anywhere">A confirmation email has been sent to {receipt.customerEmail}.</Text>}
        <Text as="p" type="inherit" color="inherit" className="mt-3">If management confirms your section, you will receive a payment link via email to pay your deposit and any additional bands. Bands do not count toward the drink minimum.</Text>
        <ActionButton href="/" variant="primary" label="Back to home" className="mt-6 w-full" />
      </VStack>
    </section>
  </main>;
}
