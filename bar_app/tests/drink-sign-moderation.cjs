const assert = require("node:assert/strict");
const { getDrinkSignError } = require("../src/lib/drink-sign.ts");

for (const text of [
  "NIGGER", "nigger!", "n1gg3r", "n.i.g.g.e.r", "n i g g e r", "n\u200bigge\u200br",
  "ｎｉｇｇｅｒ", "nіggеr", "f@gg0t", "faggots", "wetbacks", "kike", "tranny", "retarded",
]) assert.ok(getDrinkSignError(text), `Expected blocked message: ${JSON.stringify(text)}`);

for (const text of [
  undefined, "", "Happy Birthday, Alex!", "Fuck yeah!", "Bad bitch birthday", "Shit, I'm 30!",
  "Damn, looking good", "Cocktails with friends", "Scunthorpe", "Raccoon party", "Classic night",
  "Pakistani pride", "Queer joy", "Dyker Heights", "Beanery birthday",
]) assert.equal(getDrinkSignError(text), null, `Expected allowed message: ${JSON.stringify(text)}`);

console.log("PASS: slurs, common obfuscations, allowed profanity, and innocent substrings");
