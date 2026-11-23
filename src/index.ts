import path from "node:path";
import {
  DEFAULT_FORMAT,
  DEFAULT_README_PATH,
  DEFAULT_START_DATE,
  DEFAULT_USER,
  formatHelpText,
  parseCliArgs
} from "./cli-args.js";
import { formatUtcDate, getTodayUtc, parseUtcDate, splitDateRange } from "./dates.js";
import { fetchTotalDownloads } from "./downloads.js";
import { defaultSleep, fetchWithRetry } from "./http.js";
import {
  END_MARKER,
  START_MARKER,
  formatDownloadCount,
  replaceReadmeDownloads,
  updateReadmeDownloads
} from "./readme.js";
import { discoverMaintainerPackages } from "./registry.js";
import type {
  CliOptions,
  DateChunk,
  DownloadFormat,
  DownloadSummary,
  FetchLike,
  RetryOptions,
  RunOptions,
  RunResult,
  SleepFn
} from "./types.js";

export {
  DEFAULT_FORMAT,
  DEFAULT_README_PATH,
  DEFAULT_START_DATE,
  DEFAULT_USER,
  END_MARKER,
  START_MARKER,
  defaultSleep,
  discoverMaintainerPackages,
  fetchTotalDownloads,
  fetchWithRetry,
  formatDownloadCount,
  formatHelpText,
  formatUtcDate,
  getTodayUtc,
  parseCliArgs,
  parseUtcDate,
  replaceReadmeDownloads,
  splitDateRange,
  updateReadmeDownloads
};

export type {
  CliOptions,
  DateChunk,
  DownloadFormat,
  DownloadSummary,
  FetchLike,
  RetryOptions,
  RunOptions,
  RunResult,
  SleepFn
};

export async function run(options: RunOptions = {}): Promise<RunResult> {
  const user = options.user ?? DEFAULT_USER;
  const startDate = options.start ?? DEFAULT_START_DATE;
  const endDate = options.end ?? getTodayUtc();
  const readmePath = path.resolve(options.readme ?? DEFAULT_README_PATH);
  const format = options.format ?? DEFAULT_FORMAT;
  const dryRun = options.dryRun ?? false;
  const fetchImpl = options.fetchImpl ?? fetch;

  const packages = await discoverMaintainerPackages(
    user,
    fetchImpl,
    options.retry
  );
  const { perPackage, totalDownloads } = await fetchTotalDownloads(
    packages,
    startDate,
    endDate,
    fetchImpl,
    options.retry
  );
  const formattedTotal = formatDownloadCount(totalDownloads, format);

  let updated = false;
  if (!dryRun) {
    updated = await updateReadmeDownloads(readmePath, formattedTotal);
  }

  return {
    user,
    startDate,
    endDate,
    packages,
    perPackage,
    totalDownloads,
    formattedTotal,
    readmePath,
    updated
  };
}
