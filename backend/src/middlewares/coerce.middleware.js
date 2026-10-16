// The frontend forms send what the user typed, so a number arrives as a string ("10", "45000").
// The mock API of the frontend accepts that (it converts with Number()), so the real one does too:
// in the fields that hold a number, a string that is a number becomes a number before validation.
// "" and text stay as they are, so the validators still answer REQUIRED / INVALID for them.
const NUMBER_KEYS = new Set(["quantity", "unitPrice", "price", "completedQuantity", "amount", "minLevel", "change"]);
const isNumberKey = (key) => NUMBER_KEYS.has(key) || /Id$/.test(key);
const NUMERIC = /^\s*-?\d+(\.\d+)?\s*$/;

function coerce(value, key) {
  if (Array.isArray(value)) return value.map((item) => coerce(item, key));
  if (value && typeof value === "object") {
    for (const k of Object.keys(value)) value[k] = coerce(value[k], k);
    return value;
  }
  if (typeof value === "string" && key && isNumberKey(key) && NUMERIC.test(value)) return Number(value);
  return value;
}

export function coerceNumbers(req, res, next) {
  if (req.body && typeof req.body === "object") coerce(req.body);
  next();
}
