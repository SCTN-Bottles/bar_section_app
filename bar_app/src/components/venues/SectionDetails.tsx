"use client";

import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Card } from "@astryxdesign/core/Card";


import ActionButton from "@/components/ui/ActionButton";
import { Section } from "@/types/venue";
import { useConfirmation } from "@/components/ui/use-confirmation";

type SectionDetailsProps = {
  venueName: string;
  section: Section;
  bookingDate: string;
  bookingTime: string;
  onReserve: () => void;
};

export default function SectionDetails({
  venueName,
  section,
  bookingDate,
  bookingTime,
  onReserve,
}: SectionDetailsProps) {
  const sold = section.status === "sold";
  const { confirm, confirmationDialog } = useConfirmation();
  const availabilityLabel = sold ? "Sold" : "Available";

  return (
    <Card padding={5} elevation="low">
      {confirmationDialog}
      <HStack gap={3} vAlign="stretch" className="items-start justify-between">
        <VStack>
          <Text as="p" type="supporting" color="secondary" className="text-sm text-neutral-500">Selected section</Text>
          <Heading level={2} className="section-heading mt-1">{section.name}</Heading>
        </VStack>

        <Text type="supporting" color="secondary" className={sold ? undefined : "text-status-success"}>{availabilityLabel}</Text>
      </HStack>

      <Grid gap={4} className="mt-5 sm:grid-cols-section-details">
        <VStack className="relative h-32 overflow-hidden rounded-lg bg-neutral-100 sm:h-full">
          {section.imagePath ? (
            <img
              src={section.imagePath}
              alt={`${section.name} section at ${venueName}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <HStack vAlign="stretch" className="h-full items-center justify-center text-sm text-neutral-400">
              Section photo
            </HStack>
          )}
        </VStack>

        <VStack>
          <dl className="space-y-3">
            <HStack gap={3} vAlign="stretch" className="justify-between">
              <dt className="text-neutral-500">Minimum spend</dt>
              <dd className="font-medium">${section.minimumSpend}</dd>
            </HStack>
            <HStack gap={3} vAlign="stretch" className="justify-between">
              <dt className="text-neutral-500">Capacity</dt>
              <dd className="font-medium">Up to {section.capacity} guests</dd>
            </HStack>
            <HStack gap={3} vAlign="stretch" className="justify-between">
              <dt className="text-neutral-500">Deposit</dt>
              <dd className="font-medium">${section.deposit}</dd>
            </HStack>
            <HStack gap={3} vAlign="stretch" className="justify-between">
              <dt className="text-neutral-500">Reservation</dt>
              <dd className="text-right font-medium">{bookingDate} · {bookingTime}</dd>
            </HStack>
          </dl>
        </VStack>
      </Grid>

      <Text as="p" type="supporting" color="secondary" className="mt-4 text-sm text-neutral-600">{section.description}</Text>

      <ActionButton
        type="button"
        onClick={async () => {
        if (await confirm({
        title: "Age requirement: 21+",
        message: "You must be 21 years of age or older to purchase a section. By continuing, you confirm that you are at least 21 years old.",
        confirmLabel: "I’m 21 or older",
        })) onReserve();
        }}
        variant="primary"
        label="Reserve section"
        className="mt-5 w-full"
      />
    </Card>
  );
}
