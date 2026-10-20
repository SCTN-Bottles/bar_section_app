"use client";

import { formatBookingTime } from "@/lib/booking-time";
import { BeverageOption, Section } from "@/types/venue";

export type BeverageQuantities = Record<string, number>;

type BeverageSelectionProps = {
  beverages: BeverageOption[];
  section: Section;
  bookingDate: string;
  bookingTime: string;
  quantities: BeverageQuantities;
  onChangeQuantities: (quantities: BeverageQuantities) => void;
  onBack: () => void;
  onContinue: () => void;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function BeverageSelection({
  beverages,
  section,
  bookingDate,
  bookingTime,
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
      const { [id]: _, ...remaining } = quantities;
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
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          {title}
        </h3>
        <div className="space-y-2">
          {options.map((beverage) => {
            const quantity = quantities[beverage.id] ?? 0;

            return (
              <div
                key={beverage.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-3"
              >
                <div>
                  <p className="font-medium">{beverage.name}</p>
                  <p className="mt-1 text-sm text-neutral-500">
                    {formatCurrency(beverage.price)} per {beverage.type}
                  </p>
                </div>

                <div className="flex items-center gap-2" aria-label={`${beverage.name} quantity`}>
                  <button
                    type="button"
                    onClick={() => changeQuantity(beverage.id, -1)}
                    disabled={quantity === 0}
                    aria-label={`Remove one ${beverage.name}`}
                    className="flex h-9 min-h-0 w-9 items-center justify-center rounded-md border border-neutral-300 text-lg disabled:cursor-default disabled:opacity-40"
                  >
                    −
                  </button>
                  <span className="w-5 text-center font-semibold" aria-live="polite">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => changeQuantity(beverage.id, 1)}
                    aria-label={`Add one ${beverage.name}`}
                    className="flex h-9 min-h-0 w-9 items-center justify-center rounded-md border border-primary bg-primary text-lg text-on-primary hover:bg-accent"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-neutral-300 bg-neutral-50 p-6">
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-neutral-500 hover:text-foreground"
      >
        ← Back to sections
      </button>

      <div className="mt-6 rounded-lg border border-neutral-300 bg-neutral-100 p-4">
        <p className="text-sm text-neutral-500">Pre-ordering for</p>
        <p className="mt-1 text-xl font-semibold">Section {section.name}</p>
        <p className="mt-1 text-sm text-neutral-500">
          {bookingDate} · {formatBookingTime(bookingTime)}
        </p>
      </div>

      <div className="mt-6">
        <p className="text-sm text-neutral-500">Step 2 of 5</p>
        <h1 className="mt-1 text-3xl font-semibold">Bottles & kegs</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Choose at least one item, then personalize your drink sign.
        </p>
      </div>

      <div className="mt-6 space-y-6">
        {renderBeverageGroup("Bottles", bottles)}
        {renderBeverageGroup("Kegs", kegs)}
      </div>

      <div className="mt-6 space-y-3 border-t border-neutral-300 pt-5">
        <div className="flex justify-between gap-4">
          <span className="text-neutral-500">
            {selectedCount} selected item{selectedCount === 1 ? "" : "s"}
          </span>
          <span className="font-semibold">{formatCurrency(preorderTotal)}</span>
        </div>
        <div className="flex justify-between gap-4 text-sm">
          <span className="text-neutral-500">Remaining section minimum</span>
          <span>
            {remainingMinimumSpend === 0
              ? "Minimum covered"
              : formatCurrency(remainingMinimumSpend)}
          </span>
        </div>
        <div className="flex justify-between gap-4 text-sm">
          <span className="text-neutral-500">Deposit due today</span>
          <span>{formatCurrency(section.deposit)}</span>
        </div>
      </div>

      {selectedCount > 0 ? (
        <button
          type="button"
          onClick={onContinue}
          className="mt-6 block w-full rounded-md bg-primary px-5 py-3 text-center font-medium text-on-primary hover:bg-accent"
        >
          Continue to drink sign
        </button>
      ) : (
        <button
          type="button"
          disabled
          className="mt-6 w-full rounded-md bg-primary px-5 py-3 font-medium text-on-primary opacity-50"
        >
          Choose a bottle or keg to continue
        </button>
      )}
    </div>
  );
}
