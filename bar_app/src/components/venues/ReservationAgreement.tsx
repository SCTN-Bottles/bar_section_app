"use client";

import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Heading } from "@astryxdesign/core/Heading";
import { Card } from "@astryxdesign/core/Card";


import ActionButton from "@/components/ui/ActionButton";

type ReservationAgreementProps = {
  onBack: () => void;
  checkoutHref: string;
};

export default function ReservationAgreement({ onBack, checkoutHref }: ReservationAgreementProps) {
  return (
    <Card padding={6} elevation="low" className="reservation-card mx-auto max-w-3xl">
      <ActionButton
        type="button"
        onClick={onBack}
        variant="ghost"
        label="← Back to drink sign"
        className="reservation-back"
      />

      <VStack className="mt-6">
        <Text as="p" type="inherit" color="inherit" className="reservation-step">Step 5 of 6</Text>
        <Heading level={1} className="reservation-heading mt-2">Reservation agreement</Heading>
      </VStack>

      <article className="mt-6 rounded-lg border border-neutral-300 bg-neutral-100 p-6 text-sm leading-6 text-neutral-500">
        <Text as="p" type="inherit" color="inherit" className="text-xs font-semibold uppercase tracking-wider text-primary">Demo document</Text>
        <Heading level={2} className="mt-2 text-xl font-semibold text-foreground">Venue reservation agreement</Heading>
        <Text as="p" type="inherit" color="inherit" className="mt-4">This placeholder agreement outlines the terms for reserving a section at the venue. A final, venue-approved agreement will be provided before launch.</Text>

        <Heading level={3} className="mt-5 font-semibold text-foreground">Reservation terms</Heading>
        <Text as="p" type="inherit" color="inherit" className="mt-1">The reservation holder is responsible for their guests and for meeting the section&apos;s required minimum spend. The stated deposit and any additional bands are paid together after approval to confirm the reservation. Additional bands do not count toward the drink minimum.</Text>

        <Heading level={3} className="mt-5 font-semibold text-foreground">Damages and conduct</Heading>
        <Text as="p" type="inherit" color="inherit" className="mt-1">The reservation holder may be responsible for repair or replacement costs for damage caused by their party. The venue may end a reservation for unsafe, unlawful, or disruptive behavior.</Text>

        <Heading level={3} className="mt-5 font-semibold text-foreground">Cancellations</Heading>
        <Text as="p" type="inherit" color="inherit" className="mt-1">Cancellation, refund, and rescheduling terms will be added to the final agreement.</Text>

        <Text as="p" type="inherit" color="inherit" className="mt-6 border-t border-neutral-300 pt-4 text-xs">Placeholder only — this is not a final legal contract.</Text>
      </article>

      <ActionButton
        href={checkoutHref}
        variant="primary"
        label="Continue to checkout"
        className="mt-6 w-full"
      />
    </Card>
  );
}
