export type DownloadFormat = "comma" | "raw";

export interface DateChunk {
  readonly start: string;
  readonly end: string;
}

export interface RetryOptions {
  readonly maxRetries?: number;
  readonly baseDelayMs?: number;
  readonly sleep?: SleepFn;
}

export type FetchLike = (
  input: string | URL,
  init?: RequestInit
) => Promise<Response>;

export type SleepFn = (ms: number) => Promise<void>;

export interface CliOptions {
  readonly user: string;
  readonly start: string;
  readonly readme: string;
  readonly format: DownloadFormat;
  readonly dryRun: boolean;
  readonly help: boolean;
  readonly version: boolean;
}

export interface DownloadSummary {
  readonly user: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly packages: readonly string[];
  readonly perPackage: Readonly<Record<string, number>>;
  readonly totalDownloads: number;
}

export interface RunOptions {
  readonly user?: string;
  readonly start?: string;
  readonly end?: string;
  readonly readme?: string;
  readonly format?: DownloadFormat;
  readonly dryRun?: boolean;
  readonly fetchImpl?: FetchLike;
  readonly retry?: RetryOptions;
}

export interface RunResult extends DownloadSummary {
  readonly formattedTotal: string;
  readonly readmePath: string;
  readonly updated: boolean;
}
