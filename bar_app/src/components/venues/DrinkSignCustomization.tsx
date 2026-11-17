"use client";

import { VStack, HStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Heading } from "@astryxdesign/core/Heading";
import { Card } from "@astryxdesign/core/Card";


import ActionButton from "@/components/ui/ActionButton";
import { getDrinkSignError, MAX_DRINK_SIGN_LENGTH } from "@/lib/drink-sign";

type DrinkSignCustomizationProps = {
  text: string;
  onChangeText: (text: string) => void;
  onBack: () => void;
  onContinue: () => void;
};

export default function DrinkSignCustomization({
  text,
  onChangeText,
  onBack,
  onContinue,
}: DrinkSignCustomizationProps) {
  const error = getDrinkSignError(text);
  return (
    <Card padding={6} elevation="low" className="reservation-card mx-auto max-w-2xl">
      <ActionButton
        type="button"
        onClick={onBack}
        variant="ghost"
        label="← Back to drinks"
        className="reservation-back"
      />

      <VStack className="mt-6">
        <Text as="p" type="inherit" color="inherit" className="reservation-step">Step 4 of 6</Text>
        <Heading level={1} className="reservation-heading mt-2">Customize your drink sign</Heading>
        <Text as="p" type="supporting" color="secondary" className="mt-2 text-sm leading-6 text-neutral-500">
          Give your celebration a personal touch. Add the message you&apos;d like on your drink sign.
        </Text>
      </VStack>

      <figure className="drink-sign-preview mt-6 rounded-lg border border-neutral-300 px-5 pt-7 pb-5">
        <VStack className="drink-sign-board mx-auto max-w-md rounded-xl">
          <VStack className="drink-sign-face rounded-md">
            <Text as="p" type="inherit" color="inherit"
              className="drink-sign-message w-full px-4 text-center whitespace-pre-wrap wrap-anywhere sm:px-6"
              aria-live="polite"
              aria-atomic="true"
            >
              {error ? "Please update your message" : text.trim() || "Happy Birthday, Alex!"}
            </Text>
          </VStack>
        </VStack>
        <figcaption className="mt-4 text-center text-xs leading-5 text-neutral-500">
          {text.trim() ? "Live preview" : "Example message · your text will appear here"}
          <Text as="span" type="inherit" color="inherit" className="block">An illustration of your sign. The final design may vary.</Text>
        </figcaption>
      </figure>

      <form onSubmit={(event) => { event.preventDefault(); if (!error) onContinue(); }} className="mt-6">
        <label htmlFor="drink-sign-text" className="block text-sm font-medium">
          Your sign message <Text as="span" type="inherit" color="inherit" className="font-normal text-neutral-500">(optional)</Text>
        </label>
        <textarea
          id="drink-sign-text"
          name="drinkSignText"
          value={text}
          onChange={(event) => onChangeText(event.target.value)}
          maxLength={MAX_DRINK_SIGN_LENGTH}
          rows={3}
          placeholder="e.g. Happy Birthday, Alex!"
          aria-invalid={Boolean(error)}
          aria-describedby={`drink-sign-help drink-sign-count${error ? " drink-sign-error" : ""}`}
          className="mt-2 block w-full resize-y rounded-md border border-neutral-300 bg-neutral-100 px-4 py-3 text-base leading-6 placeholder:text-neutral-500 focus:border-primary"
        />
        <HStack gap={4} vAlign="stretch" className="mt-2 justify-between text-xs leading-5 text-neutral-500">
          <Text as="p" type="inherit" color="inherit" id="drink-sign-help">Leave this blank if you don&apos;t want a custom message.</Text>
          <Text as="span" type="inherit" color="inherit" id="drink-sign-count" className="shrink-0">{text.length}/{MAX_DRINK_SIGN_LENGTH}</Text>
        </HStack>
        <Text as="p" type="supporting" color="secondary" className="mt-2 text-xs text-neutral-500">Slurs are not allowed. General profanity is allowed.</Text>
        {error && <Text as="p" type="inherit" color="inherit" id="drink-sign-error" role="alert" className="mt-3 text-sm text-red-700">{error}</Text>}
        <ActionButton type="submit" disabled={Boolean(error)} variant="primary" label="Continue to agreement" className="mt-6 w-full" />
      </form>
    </Card>
  );
}
