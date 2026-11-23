import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fetchWithRetry } from "../src/http.js";
import type { FetchLike } from "../src/types.js";

describe("fetchWithRetry", () => {
  it("retries on 429 and 5xx with exponential backoff and Retry-After", async () => {
    const delays: number[] = [];
    let calls = 0;

    const mockFetch: FetchLike = async () => {
      calls += 1;
      if (calls === 1) {
        return new Response("rate limited", {
          status: 429,
          headers: { "retry-after": "2" }
        });
      }
      if (calls === 2) {
        return new Response("server error", { status: 503 });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    };

    const response = await fetchWithRetry("https://api.npmjs.org/test", mockFetch, {
      maxRetries: 3,
      baseDelayMs: 100,
      sleep: async (ms) => {
        delays.push(ms);
      }
    });

    assert.equal(response.status, 200);
    assert.equal(calls, 3);
    assert.deepEqual(delays, [2000, 200]);
  });

  it("does not retry non-retryable 4xx responses", async () => {
    let calls = 0;
    const mockFetch: FetchLike = async () => {
      calls += 1;
      return new Response("not found", { status: 404 });
    };

    const response = await fetchWithRetry("https://api.npmjs.org/missing", mockFetch, {
      maxRetries: 3,
      baseDelayMs: 10,
      sleep: async () => {}
    });

    assert.equal(response.status, 404);
    assert.equal(calls, 1);
  });

  it("retries transient network errors and throws after exhausting retries", async () => {
    const delays: number[] = [];
    let calls = 0;

    const mockFetch: FetchLike = async () => {
      calls += 1;
      throw new TypeError("socket hang up");
    };

    await assert.rejects(
      () =>
        fetchWithRetry("https://api.npmjs.org/down", mockFetch, {
          maxRetries: 2,
          baseDelayMs: 50,
          sleep: async (ms) => {
            delays.push(ms);
          }
        }),
      /Network request failed/
    );

    assert.equal(calls, 3);
    assert.deepEqual(delays, [50, 100]);
  });
});
