import type { FetchLike, RetryOptions, SleepFn } from "./types.js";

const DEFAULT_MAX_RETRIES = 4;
const DEFAULT_BASE_DELAY_MS = 400;
const MAX_BACKOFF_MS = 15_000;

export const defaultSleep: SleepFn = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

function isRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

function parseRetryAfterMs(headerValue: string | null): number | null {
  if (!headerValue) {
    return null;
  }
  const seconds = Number(headerValue.trim());
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1000, MAX_BACKOFF_MS);
  }
  const retryDate = Date.parse(headerValue);
  if (!Number.isNaN(retryDate)) {
    const delta = retryDate - Date.now();
    if (delta > 0) {
      return Math.min(delta, MAX_BACKOFF_MS);
    }
  }
  return null;
}

function computeDelayMs(attempt: number, baseDelayMs: number, retryAfter: string | null): number {
  const headerDelay = parseRetryAfterMs(retryAfter);
  if (headerDelay !== null) {
    return headerDelay;
  }
  return Math.min(baseDelayMs * Math.pow(2, attempt), MAX_BACKOFF_MS);
}

export async function fetchWithRetry(
  url: string,
  fetchImpl: FetchLike = fetch,
  options?: RetryOptions
): Promise<Response> {
  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelayMs = options?.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const sleep = options?.sleep ?? defaultSleep;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "npm-dl-inline"
        }
      });

      if (!isRetryableStatus(response.status) || attempt === maxRetries) {
        return response;
      }

      const delayMs = computeDelayMs(
        attempt,
        baseDelayMs,
        response.headers.get("retry-after")
      );
      await sleep(delayMs);
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries) {
        break;
      }
      const delayMs = computeDelayMs(attempt, baseDelayMs, null);
      await sleep(delayMs);
    }
  }

  const message =
    lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Network request failed for ${url}: ${message}`);
}
