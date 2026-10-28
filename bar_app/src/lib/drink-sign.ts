export const MAX_DRINK_SIGN_LENGTH = 80;
export const DRINK_SIGN_CONTENT_ERROR = "Slurs are not allowed on drink signs. Please change your message to continue.";

// Keep this list specific to slurs: general profanity is intentionally allowed.
// Match whole words to avoid blocking innocent names and words containing a substring.
const slurs = [
  "nigger", "niggers", "nigga", "niggas", "niggah", "niggahs",
  "fag", "fags", "faggot", "faggots", "faggotty", "dyke", "dykes",
  "tranny", "trannies", "shemale", "shemales",
  "chink", "chinks", "gook", "gooks", "spic", "spics", "spick", "spicks",
  "wetback", "wetbacks", "beaner", "beaners", "kike", "kikes",
  "coon", "coons", "towelhead", "towelheads", "raghead", "ragheads",
  "paki", "pakis", "redskin", "redskins", "zipperhead", "zipperheads",
  "retard", "retards", "retarded",
];
const slurPatterns = slurs.map((word) => new RegExp(
  `(?:^|[^\\p{L}\\p{N}])${word.split("").join("[^\\p{L}\\p{N}]*")}(?=$|[^\\p{L}\\p{N}])`, "u",
));

function moderationText(value: string, decodeLeet = true) {
  const substitutions: Record<string, string> = {
    "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b",
    "@": "a", "$": "s", "!": "i",
    "а": "a", "е": "e", "і": "i", "о": "o", "с": "c", "ѕ": "s", "т": "t",
  };
  return value.normalize("NFKD").toLowerCase()
    .replace(/[\p{M}\p{Cf}]/gu, "")
    .replace(/[0134578@$!аеіосѕт]/gu, (letter) => decodeLeet || /[аеіосѕт]/u.test(letter) ? substitutions[letter] : letter);
}

export function getDrinkSignError(value?: string): string | null {
  const text = moderationText(value ?? "");
  const literal = moderationText(value ?? "", false);
  return slurPatterns.some((pattern) => pattern.test(text) || pattern.test(literal)) ? DRINK_SIGN_CONTENT_ERROR : null;
}

export function normalizeDrinkSignText(value?: string) {
  return (value ?? "").slice(0, MAX_DRINK_SIGN_LENGTH).trim();
}
