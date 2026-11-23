import type { DateChunk } from "./types.js";

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;
const MAX_CHUNK_DAYS = 365;

export function formatUtcDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getTodayUtc(now: Date = new Date()): string {
  return formatUtcDate(now);
}

export function parseUtcDate(value: string): Date {
  const match = DATE_PATTERN.exec(value);
  if (!match) {
    throw new Error(`Invalid date "${value}". Expected YYYY-MM-DD format.`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Invalid calendar date "${value}".`);
  }

  return date;
}

export function splitDateRange(
  startDate: string,
  endDate: string = getTodayUtc(),
  maxChunkDays: number = MAX_CHUNK_DAYS
): DateChunk[] {
  if (!Number.isInteger(maxChunkDays) || maxChunkDays < 1) {
    throw new Error(`maxChunkDays must be a positive integer, received ${maxChunkDays}.`);
  }

  const startMs = parseUtcDate(startDate).getTime();
  const endMs = parseUtcDate(endDate).getTime();

  if (startMs > endMs) {
    throw new Error(
      `Start date "${startDate}" cannot be after end date "${endDate}".`
    );
  }

  const chunks: DateChunk[] = [];
  let cursorMs = startMs;

  while (cursorMs <= endMs) {
    const chunkEndMs = Math.min(cursorMs + (maxChunkDays - 1) * MS_PER_DAY, endMs);
    chunks.push({
      start: formatUtcDate(new Date(cursorMs)),
      end: formatUtcDate(new Date(chunkEndMs))
    });
    cursorMs = chunkEndMs + MS_PER_DAY;
  }

  return chunks;
}
