import { getTodayUtc, splitDateRange } from "./dates.js";
import { fetchWithRetry } from "./http.js";
import type { DateChunk, FetchLike, RetryOptions } from "./types.js";

const DOWNLOADS_POINT_BASE_URL = "https://api.npmjs.org/downloads/point";
const MAX_BULK_BATCH_SIZE = 128;

interface SinglePackageDownloadPayload {
  readonly downloads?: unknown;
  readonly package?: unknown;
  readonly error?: unknown;
}

type BulkPackageDownloadPayload = Record<
  string,
  SinglePackageDownloadPayload | null | undefined
>;

export interface AggregateDownloadsResult {
  readonly perPackage: Record<string, number>;
  readonly totalDownloads: number;
}

function isScopedPackage(packageName: string): boolean {
  return packageName.startsWith("@");
}

function chunkArray<T>(items: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function extractDownloadsCount(entry: unknown): number {
  if (typeof entry !== "object" || entry === null) {
    return 0;
  }
  const value = (entry as SinglePackageDownloadPayload).downloads;
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  return 0;
}

async function fetchSinglePackageChunk(
  packageName: string,
  chunk: DateChunk,
  fetchImpl: FetchLike,
  retry?: RetryOptions
): Promise<number> {
  const encodedName = encodeURIComponent(packageName);
  const url = `${DOWNLOADS_POINT_BASE_URL}/${chunk.start}:${chunk.end}/${encodedName}`;
  const response = await fetchWithRetry(url, fetchImpl, retry);

  if (response.status === 404) {
    return 0;
  }
  if (!response.ok) {
    throw new Error(
      `npm downloads API failed with HTTP ${response.status} for "${packageName}" (${chunk.start}:${chunk.end}).`
    );
  }

  const payload = (await response.json()) as SinglePackageDownloadPayload;
  return extractDownloadsCount(payload);
}

async function fetchBulkUnscopedChunk(
  batch: readonly string[],
  chunk: DateChunk,
  fetchImpl: FetchLike,
  retry?: RetryOptions
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const name of batch) {
    counts[name] = 0;
  }

  if (batch.length === 0) {
    return counts;
  }

  const encodedBatch = batch.map((name) => encodeURIComponent(name)).join(",");
  const url = `${DOWNLOADS_POINT_BASE_URL}/${chunk.start}:${chunk.end}/${encodedBatch}`;
  const response = await fetchWithRetry(url, fetchImpl, retry);

  if (response.status === 404) {
    return counts;
  }
  if (!response.ok) {
    throw new Error(
      `npm bulk downloads API failed with HTTP ${response.status} for ${batch.length} package(s) (${chunk.start}:${chunk.end}).`
    );
  }

  const payload = (await response.json()) as
    | SinglePackageDownloadPayload
    | BulkPackageDownloadPayload;

  if (batch.length === 1) {
    const singleName = batch[0];
    if (singleName !== undefined) {
      if (
        typeof payload === "object" &&
        payload !== null &&
        "downloads" in payload
      ) {
        counts[singleName] = extractDownloadsCount(payload);
      } else if (
        typeof payload === "object" &&
        payload !== null &&
        singleName in payload
      ) {
        counts[singleName] = extractDownloadsCount(
          (payload as BulkPackageDownloadPayload)[singleName]
        );
      }
    }
    return counts;
  }

  if (typeof payload === "object" && payload !== null) {
    const bulkPayload = payload as BulkPackageDownloadPayload;
    for (const name of batch) {
      counts[name] = extractDownloadsCount(bulkPayload[name]);
    }
  }

  return counts;
}

export async function fetchTotalDownloads(
  packages: readonly string[],
  startDate: string,
  endDate: string = getTodayUtc(),
  fetchImpl: FetchLike = fetch,
  retry?: RetryOptions
): Promise<AggregateDownloadsResult> {
  const chunks = splitDateRange(startDate, endDate);
  const perPackage: Record<string, number> = {};

  for (const name of packages) {
    perPackage[name] = 0;
  }

  if (packages.length === 0) {
    return { perPackage, totalDownloads: 0 };
  }

  const unscoped = packages.filter((name) => !isScopedPackage(name));
  const scoped = packages.filter((name) => isScopedPackage(name));
  const unscopedBatches = chunkArray(unscoped, MAX_BULK_BATCH_SIZE);

  for (const chunk of chunks) {
    for (const batch of unscopedBatches) {
      const batchCounts = await fetchBulkUnscopedChunk(
        batch,
        chunk,
        fetchImpl,
        retry
      );
      for (const name of batch) {
        perPackage[name] = (perPackage[name] ?? 0) + (batchCounts[name] ?? 0);
      }
    }

    for (const packageName of scoped) {
      const count = await fetchSinglePackageChunk(
        packageName,
        chunk,
        fetchImpl,
        retry
      );
      perPackage[packageName] = (perPackage[packageName] ?? 0) + count;
    }
  }

  let totalDownloads = 0;
  for (const name of packages) {
    totalDownloads += perPackage[name] ?? 0;
  }

  return { perPackage, totalDownloads };
}
