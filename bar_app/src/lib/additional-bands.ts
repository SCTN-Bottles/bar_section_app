export const ADDITIONAL_BAND_PRICE = 20;
export const MAX_ADDITIONAL_BANDS = 5;

export function isValidAdditionalBands(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= MAX_ADDITIONAL_BANDS;
}

// Missing counts keep existing reservation links compatible. Explicit malformed values fail closed.
export function parseAdditionalBands(value: string | undefined): number | null {
  if (value === undefined) return 0;
  return /^[0-5]$/.test(value) ? Number(value) : null;
}
