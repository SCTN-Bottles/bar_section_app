"use client";

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
  return <div className="mx-auto max-w-2xl rounded-xl border border-neutral-300 bg-neutral-50 p-6">
    <button type="button" onClick={onBack} className="text-sm text-neutral-500 hover:text-foreground">← Back to sections</button>
    <p className="mt-6 text-sm text-neutral-500">Step 2 of 6</p>
    <h1 className="mt-1 text-3xl font-semibold">Additional bands</h1>
    <p className="mt-4">Would you like to purchase additional bands to allow more people in your section?</p>
    <p className="mt-2 text-sm text-neutral-500">{section.name} includes up to {section.capacity} guests. Each additional band admits one more guest.</p>
    <div className="mt-6 flex gap-3" role="group" aria-label="Purchase additional bands">
      {(["yes", "no"] as const).map((answer) => <button key={answer} type="button" aria-pressed={choice === answer} onClick={() => onChoice(answer)} className={`rounded-md border px-6 py-3 font-medium ${choice === answer ? "border-primary bg-primary text-on-primary" : "border-neutral-300 hover:border-primary"}`}>{answer === "yes" ? "Yes" : "No"}</button>)}
    </div>
    {choice === "yes" && <div className="mt-6">
      <label htmlFor="additional-bands" className="block font-medium">Number of additional bands</label>
      <input id="additional-bands" type="number" min={0} max={MAX_ADDITIONAL_BANDS} step={1} value={quantity} onChange={(event) => onQuantity(event.target.value)} aria-describedby="additional-bands-help" aria-invalid={!valid} className="input mt-2 max-w-32" />
      <p id="additional-bands-help" className="mt-2 text-sm text-neutral-500">Enter a whole number from 0 to {MAX_ADDITIONAL_BANDS}. ${ADDITIONAL_BAND_PRICE} per band, paid with your deposit after approval. Bands do not count toward the drink minimum.</p>
      {!valid && <p role="alert" className="mt-2 text-sm text-red-700">Enter a whole number from 0 to {MAX_ADDITIONAL_BANDS}.</p>}
    </div>}
    {valid && <dl aria-live="polite" className="mt-6 space-y-3 border-t border-neutral-300 pt-5">
      <div className="flex justify-between"><dt>Additional bands ({count})</dt><dd>${count * ADDITIONAL_BAND_PRICE}</dd></div>
      <div className="flex justify-between"><dt>Total guest allowance</dt><dd>Up to {section.capacity + count} guests</dd></div>
      <div className="flex justify-between font-semibold"><dt>Due after approval</dt><dd>${section.deposit + count * ADDITIONAL_BAND_PRICE}</dd></div>
    </dl>}
    <button type="button" disabled={!valid} onClick={onContinue} className="mt-6 w-full rounded-md bg-primary px-5 py-3 font-medium text-on-primary hover:bg-accent disabled:opacity-50">Continue to drinks</button>
  </div>;
}
