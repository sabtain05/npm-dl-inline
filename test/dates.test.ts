import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatUtcDate, getTodayUtc, parseUtcDate, splitDateRange } from "../src/dates.js";

describe("dates", () => {
  it("formats and parses valid UTC dates", () => {
    const parsed = parseUtcDate("2026-01-01");
    assert.equal(formatUtcDate(parsed), "2026-01-01");
    assert.equal(getTodayUtc(new Date("2026-11-22T23:59:59Z")), "2026-11-22");
  });

  it("rejects malformed or non-existent calendar dates", () => {
    assert.throws(() => parseUtcDate("2026/01/01"), /Invalid date/);
    assert.throws(() => parseUtcDate("2026-02-29"), /Invalid calendar date/);
    assert.throws(() => parseUtcDate("2026-13-01"), /Invalid calendar date/);
  });

  it("returns a single chunk when range is within 365 days", () => {
    const chunks = splitDateRange("2026-01-01", "2026-11-22");
    assert.deepEqual(chunks, [{ start: "2026-01-01", end: "2026-11-22" }]);
  });

  it("handles a single-day date range", () => {
    const chunks = splitDateRange("2026-06-15", "2026-06-15");
    assert.deepEqual(chunks, [{ start: "2026-06-15", end: "2026-06-15" }]);
  });

  it("splits multi-year ranges into contiguous 365-day chunks across leap years", () => {
    const chunks = splitDateRange("2024-01-01", "2026-01-05");
    assert.deepEqual(chunks, [
      { start: "2024-01-01", end: "2024-12-30" },
      { start: "2024-12-31", end: "2025-12-30" },
      { start: "2025-12-31", end: "2026-01-05" }
    ]);
  });

  it("throws when start date is after end date", () => {
    assert.throws(() => splitDateRange("2026-12-01", "2026-01-01"), /cannot be after/);
  });
});
