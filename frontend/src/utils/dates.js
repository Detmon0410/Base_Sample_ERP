// Dates of documents are plain "YYYY-MM-DD" strings in the local calendar (no time zone shifts).
const pad = (n) => String(n).padStart(2, "0");

export function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

