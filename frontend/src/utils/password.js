const LETTERS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";

/** A password the Admin can read out: 10 characters, no look-alikes (0/O, 1/l/I), always a letter and a digit. */
export function generatePassword() {
  const pick = (set) => set[crypto.getRandomValues(new Uint32Array(1))[0] % set.length];
  const chars = [pick(DIGITS), pick(DIGITS), pick(LETTERS)];
  while (chars.length < 10) chars.push(pick(LETTERS + DIGITS));
  return chars.sort(() => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32 - 0.5).join("");
}
