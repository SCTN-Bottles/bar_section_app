"use client";

import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Heading } from "@astryxdesign/core/Heading";
import { Card } from "@astryxdesign/core/Card";


import ActionButton from "@/components/ui/ActionButton";
import { ADDITIONAL_BAND_PRICE } from "@/lib/additional-bands";
import { formatBookingTime } from "@/lib/booking-time";
import { BeverageOption, Section } from "@/types/venue";

export type BeverageQuantities = Record<string, number>;

type BeverageSelectionProps = {
  beverages: BeverageOption[];
  section: Section;
  bookingDate: string;
  bookingTime: string;
  additionalBands?: number;
  quantities: BeverageQuantities;
  onChangeQuantities: (quantities: BeverageQuantities) => void;
  onBack: () => void;
  onContinue: () => void;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function BeverageSelection({
  beverages,
  section,
  bookingDate,
  bookingTime,
  additionalBands = 0,
  quantities,
  onChangeQuantities,
  onBack,
  onContinue,
}: BeverageSelectionProps) {
  const bottles = beverages.filter((beverage) => beverage.type === "bottle");
  const kegs = beverages.filter((beverage) => beverage.type === "keg");

  function changeQuantity(id: string, amount: number) {
    const nextQuantity = Math.max(0, (quantities[id] ?? 0) + amount);

    if (nextQuantity === 0) {
      const remaining = { ...quantities };
      delete remaining[id];
      onChangeQuantities(remaining);
      return;
    }

    onChangeQuantities({ ...quantities, [id]: nextQuantity });
  }

  const preorderTotal = beverages.reduce(
    (total, beverage) => total + beverage.price * (quantities[beverage.id] ?? 0),
    0,
  );
  const selectedCount = Object.values(quantities).reduce(
    (total, quantity) => total + quantity,
    0,
  );
  const remainingMinimumSpend = Math.max(0, section.minimumSpend - preorderTotal);

  function renderBeverageGroup(title: string, options: BeverageOption[]) {
    return (
      <VStack>
        <Heading level={3} className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          {title}
        </Heading>
        <VStack gap={2} className="">
          {options.map((beverage) => {
            const quantity = quantities[beverage.id] ?? 0;

            return (
              <HStack gap={3} vAlign="stretch"
                key={beverage.id}
                className="sctn-inset items-center justify-between px-3 py-3"
              >
                <VStack>
                  <Text as="p" type="inherit" color="inherit" className="font-medium">{beverage.name}</Text>
                  <Text as="p" type="supporting" color="secondary" className="mt-1 text-sm text-neutral-500">
                    {formatCurrency(beverage.price)} per {beverage.type}
                  </Text>
                </VStack>

                <HStack gap={2} vAlign="stretch" className="items-center" aria-label={`${beverage.name} quantity`}>
                  <ActionButton
                    type="button"
                    onClick={() => changeQuantity(beverage.id, -1)}
                    disabled={quantity === 0}
                    aria-label={`Remove one ${beverage.name}`}
                    variant="secondary"
                    label="−"
                    className="reservation-quantity"
                  />
                  <Text as="span" type="inherit" color="inherit" className="w-5 text-center font-semibold" aria-live="polite">
                    {quantity}
                  </Text>
                  <ActionButton
                    type="button"
                    onClick={() => changeQuantity(beverage.id, 1)}
                    aria-label={`Add one ${beverage.name}`}
                    variant="primary"
                    label="+"
                    className="reservation-quantity"
                  />
                </HStack>
              </HStack>
            );
          })}
        </VStack>
      </VStack>
    );
  }

  return (
    <Card padding={6} elevation="low" className="reservation-card mx-auto max-w-2xl">
      <ActionButton
        type="button"
        onClick={onBack}
        variant="ghost"
        label="← Back to bands"
        className="reservation-back"
      />

      <VStack className="sctn-inset mt-6 p-4">
        <Text as="p" type="supporting" color="secondary" className="text-sm text-neutral-500">Pre-ordering for</Text>
        <Text as="p" type="inherit" color="inherit" className="mt-1 text-xl font-semibold">Section {section.name}</Text>
        <Text as="p" type="supporting" color="secondary" className="mt-1 text-sm text-neutral-500">
          {bookingDate} · {formatBookingTime(bookingTime)}
        </Text>
      </VStack>

      <VStack className="mt-6">
        <Text as="p" type="inherit" color="inherit" className="reservation-step">Step 3 of 6</Text>
        <Heading level={1} className="reservation-heading mt-2">Bottles & kegs</Heading>
        <Text as="p" type="supporting" color="secondary" className="mt-2 text-sm text-neutral-500">
          {beverages.length ? "Choose at least one item, then personalize your drink sign." : "No drinks are offered for this date. Continue to personalize your drink sign."}
        </Text>
      </VStack>

      <VStack gap={6} className="mt-6">
        {renderBeverageGroup("Bottles", bottles)}
        {renderBeverageGroup("Kegs", kegs)}
      </VStack>

      <VStack gap={3} className="mt-6 border-t border-neutral-300 pt-5">
        <HStack gap={4} vAlign="stretch" className="justify-between">
          <Text as="span" type="inherit" color="inherit" className="text-neutral-500">
            {selectedCount} selected item{selectedCount === 1 ? "" : "s"}
          </Text>
          <Text as="span" type="inherit" color="inherit" className="font-semibold">{formatCurrency(preorderTotal)}</Text>
        </HStack>
        <HStack gap={4} vAlign="stretch" className="justify-between text-sm">
          <Text as="span" type="inherit" color="inherit" className="text-neutral-500">Remaining section minimum</Text>
          <Text as="span" type="inherit" color="inherit">
            {remainingMinimumSpend === 0
              ? "Minimum covered"
              : formatCurrency(remainingMinimumSpend)}
          </Text>
        </HStack>
        <HStack gap={4} vAlign="stretch" className="justify-between text-sm">
          <Text as="span" type="inherit" color="inherit" className="text-neutral-500">Deposit due after approval</Text>
          <Text as="span" type="inherit" color="inherit">{formatCurrency(section.deposit)}</Text>
        </HStack>
        <HStack gap={4} vAlign="stretch" className="justify-between text-sm"><Text as="span" type="inherit" color="inherit">Additional bands ({additionalBands})</Text><Text as="span" type="inherit" color="inherit">{formatCurrency(additionalBands * ADDITIONAL_BAND_PRICE)}</Text></HStack>
        <HStack gap={4} vAlign="stretch" className="sctn-total mt-3 justify-between font-semibold tabular-nums"><Text as="span" type="inherit" color="inherit">Total due after approval</Text><Text as="span" type="inherit" color="inherit">{formatCurrency(section.deposit + additionalBands * ADDITIONAL_BAND_PRICE)}</Text></HStack>
      </VStack>

      {selectedCount > 0 || beverages.length === 0 ? (
        <ActionButton
          type="button"
          onClick={onContinue}
          variant="primary"
          label="Continue to drink sign"
          className="mt-6 w-full"
        />
      ) : (
        <ActionButton
          type="button"
          disabled
          variant="primary"
          label="Choose a bottle or keg to continue"
          className="mt-6 w-full"
        />
      )}
    </Card>
  );
}
