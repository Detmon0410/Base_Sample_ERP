import { formatCurrency, formatDate, formatNumber } from "./format";

describe("formatCurrency", () => {
  it("shows whole yen with a yen sign and thousands separators", () => {
    expect(formatCurrency(1234567, "en")).toBe("¥1,234,567");
    expect(formatCurrency(0, "en")).toBe("¥0");
  });

  it("treats a missing value as zero and never shows decimals", () => {
    expect(formatCurrency(undefined, "en")).toBe("¥0");
    expect(formatCurrency(1999.6, "en")).toBe("¥2,000");
  });
});

describe("formatNumber", () => {
  it("groups thousands", () => {
    expect(formatNumber(87.5, "en")).toBe("87.5");
    expect(formatNumber(12000, "en")).toBe("12,000");
  });
});

describe("formatDate", () => {
  it("shows an ISO date in English and nothing for empty or invalid input", () => {
    expect(formatDate("2026-10-02", "en")).toBe("2026-10-02");
    expect(formatDate("", "en")).toBe("");
    expect(formatDate("not a date", "en")).toBe("");
  });

  it("writes the Japanese format for ja", () => {
    expect(formatDate("2026-10-02", "ja")).toBe("2026年10月2日");
  });
});
