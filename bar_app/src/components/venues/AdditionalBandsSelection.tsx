"use client";

import { Text } from "@astryxdesign/core/Text";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Heading } from "@astryxdesign/core/Heading";
import { Card } from "@astryxdesign/core/Card";


import ActionButton from "@/components/ui/ActionButton";
import { ADDITIONAL_BAND_PRICE, MAX_ADDITIONAL_BANDS, isValidAdditionalBands } from "@/lib/additional-bands";
import type { Section } from "@/types/venue";

export type BandChoice = "yes" | "no" | null;

type Props = {
  section: Section;
  choice: BandChoice;
  quantity: string;
  onChoice: (choice: "yes" | "no") => void;
  onQuantity: (quantity: string) => void;
  onBack: () => void;
  onContinue: () => void;
};

export default function AdditionalBandsSelection({ section, choice, quantity, onChoice, onQuantity, onBack, onContinue }: Props) {
  const count = choice === "no" ? 0 : Number(quantity);
  const valid = choice !== null && (choice === "no" || quantity.trim() !== "" && isValidAdditionalBands(count));
  return <Card padding={6} elevation="low" className="reservation-card mx-auto max-w-2xl">
    <ActionButton
      type="button"
      onClick={onBack}
      variant="ghost"
      label="← Back to sections"
      className="reservation-back"
    />
    <Text as="p" type="inherit" color="inherit" className="mt-6 reservation-step">Step 2 of 6</Text>
    <Heading level={1} className="reservation-heading mt-2">Additional bands</Heading>
    <Text as="p" type="inherit" color="inherit" className="mt-4">Would you like to purchase additional bands to allow more people in your section?</Text>
    <Text as="p" type="supporting" color="secondary" className="mt-2 text-sm text-neutral-500">{section.name} includes up to {section.capacity} guests. Each additional band admits one more guest.</Text>
    <HStack gap={3} vAlign="stretch" className="mt-6" role="group" aria-label="Purchase additional bands">
      {(["yes", "no"] as const).map((answer) => <ActionButton
        key={answer}
        type="button"
        aria-pressed={choice === answer}
        onClick={() => onChoice(answer)}
        variant={choice === answer ? "primary" : "secondary"}
        label={String(answer === "yes" ? "Yes" : "No")}
      />)}
    </HStack>
    {choice === "yes" && <VStack className="mt-6">
      <label htmlFor="additional-bands" className="block font-medium">Number of additional bands</label>
      <input id="additional-bands" type="number" min={0} max={MAX_ADDITIONAL_BANDS} step={1} value={quantity} onChange={(event) => onQuantity(event.target.value)} aria-describedby="additional-bands-help" aria-invalid={!valid} className="input mt-2 max-w-32" />
      <Text as="p" type="supporting" color="secondary" id="additional-bands-help" className="mt-2 text-sm text-neutral-500">Enter a whole number from 0 to {MAX_ADDITIONAL_BANDS}. ${ADDITIONAL_BAND_PRICE} per band, paid with your deposit after approval. Bands do not count toward the drink minimum.</Text>
      {!valid && <Text as="p" type="inherit" color="inherit" role="alert" className="mt-2 text-sm text-red-700">Enter a whole number from 0 to {MAX_ADDITIONAL_BANDS}.</Text>}
    </VStack>}
    {choice === "yes" && valid && <dl aria-live="polite" className="mt-6 space-y-3 border-t border-neutral-300 pt-5">
      <HStack vAlign="stretch" className="justify-between"><dt>Additional bands ({count})</dt><dd>${count * ADDITIONAL_BAND_PRICE}</dd></HStack>
      <HStack vAlign="stretch" className="justify-between"><dt>Total guest allowance</dt><dd>Up to {section.capacity + count} guests</dd></HStack>
      <HStack vAlign="stretch" className="justify-between font-semibold"><dt>Due after approval</dt><dd>${section.deposit + count * ADDITIONAL_BAND_PRICE}</dd></HStack>
    </dl>}
    {choice === "yes" && <ActionButton type="button" disabled={!valid} onClick={onContinue} variant="primary" label="Confirm bands" className="mt-6 w-full" />}
  </Card>;
}
