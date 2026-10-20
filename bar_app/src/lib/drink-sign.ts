export const MAX_DRINK_SIGN_LENGTH = 80;

export function normalizeDrinkSignText(value?: string) {
  return (value ?? "").slice(0, MAX_DRINK_SIGN_LENGTH).trim();
}
