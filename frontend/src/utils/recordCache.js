// Rows of the master data lists that were loaded last. When a row is opened in the detail sheet the form
// is filled from here at once (no skeleton, no waiting) and the full record is fetched in the background.
const cache = new Map();

export function rememberRecords(key, items) {
  if (!key) return;
  for (const item of items) cache.set(`${key}:${item.id}`, item);
}

export function getCachedRecord(key, id) {
  return key && id != null ? cache.get(`${key}:${Number(id)}`) : undefined;
}
