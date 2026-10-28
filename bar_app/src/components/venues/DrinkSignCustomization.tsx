"use client";

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
    <div className="mx-auto max-w-2xl rounded-xl border border-neutral-300 bg-neutral-50 p-6">
      <button type="button" onClick={onBack} className="text-sm text-neutral-500 hover:text-foreground">
        ← Back to drinks
      </button>

      <div className="mt-6">
        <p className="text-sm text-neutral-500">Step 3 of 5</p>
        <h1 className="mt-1 text-3xl font-semibold">Customize your drink sign</h1>
        <p className="mt-2 text-sm leading-6 text-neutral-500">
          Give your celebration a personal touch. Add the message you&apos;d like on your drink sign.
        </p>
      </div>

      <figure className="drink-sign-preview mt-6 rounded-lg border border-neutral-300 px-5 pt-7 pb-5">
        <div className="drink-sign-board mx-auto max-w-md rounded-xl">
          <div className="drink-sign-face rounded-md">
            <p
              className="drink-sign-message w-full px-4 text-center whitespace-pre-wrap [overflow-wrap:anywhere] sm:px-6"
              aria-live="polite"
              aria-atomic="true"
            >
              {error ? "Please update your message" : text.trim() || "Happy Birthday, Alex!"}
            </p>
          </div>
        </div>
        <figcaption className="mt-4 text-center text-xs leading-5 text-neutral-500">
          {text.trim() ? "Live preview" : "Example message · your text will appear here"}
          <span className="block">An illustration of your sign. The final design may vary.</span>
        </figcaption>
      </figure>

      <form onSubmit={(event) => { event.preventDefault(); if (!error) onContinue(); }} className="mt-6">
        <label htmlFor="drink-sign-text" className="block text-sm font-medium">
          Your sign message <span className="font-normal text-neutral-500">(optional)</span>
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
        <div className="mt-2 flex justify-between gap-4 text-xs leading-5 text-neutral-500">
          <p id="drink-sign-help">Leave this blank if you don&apos;t want a custom message.</p>
          <span id="drink-sign-count" className="shrink-0">{text.length}/{MAX_DRINK_SIGN_LENGTH}</span>
        </div>
        <p className="mt-2 text-xs text-neutral-500">Slurs are not allowed. General profanity is allowed.</p>
        {error && <p id="drink-sign-error" role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={Boolean(error)} className="mt-6 w-full rounded-md bg-primary px-5 py-3 text-center font-medium text-on-primary hover:bg-accent disabled:opacity-50">
          Continue to agreement
        </button>
      </form>
    </div>
  );
}
