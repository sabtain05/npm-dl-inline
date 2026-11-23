import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fetchTotalDownloads } from "../src/downloads.js";
import type { FetchLike } from "../src/types.js";

describe("fetchTotalDownloads", () => {
  it("handles single unscoped package, bulk unscoped batches, scoped packages, 404s, and multi-chunk aggregation", async () => {
    const requestedUrls: string[] = [];

    const mockFetch: FetchLike = async (input) => {
      const url = String(input);
      requestedUrls.push(url);

      if (url.endsWith("/failover-boundary,kinetoast")) {
        if (url.includes("2025-01-01:2025-12-31")) {
          return new Response(
            JSON.stringify({
              "failover-boundary": { downloads: 1200 },
              kinetoast: null
            }),
            { status: 200 }
          );
        }
        return new Response(
          JSON.stringify({
            "failover-boundary": { downloads: 800 },
            kinetoast: { downloads: 3000 }
          }),
          { status: 200 }
        );
      }

      if (url.endsWith("/%40sabtain05%2Fcore")) {
        if (url.includes("2025-01-01:2025-12-31")) {
          return new Response("not found", { status: 404 });
        }
        return new Response(
          JSON.stringify({ downloads: 420, package: "@sabtain05/core" }),
          { status: 200 }
        );
      }

      return new Response("unexpected", { status: 500 });
    };

    const result = await fetchTotalDownloads(
      ["failover-boundary", "kinetoast", "@sabtain05/core"],
      "2025-01-01",
      "2026-03-01",
      mockFetch,
      { maxRetries: 0 }
    );

    assert.equal(result.totalDownloads, 5420);
    assert.deepEqual(result.perPackage, {
      "failover-boundary": 2000,
      kinetoast: 3000,
      "@sabtain05/core": 420
    });
    assert.equal(requestedUrls.length, 4);
  });

  it("handles a single unscoped package response shape", async () => {
    const mockFetch: FetchLike = async () =>
      new Response(
        JSON.stringify({
          downloads: 777,
          start: "2026-01-01",
          end: "2026-02-01",
          package: "kinetoast"
        }),
        { status: 200 }
      );

    const result = await fetchTotalDownloads(
      ["kinetoast"],
      "2026-01-01",
      "2026-02-01",
      mockFetch,
      { maxRetries: 0 }
    );

    assert.equal(result.totalDownloads, 777);
    assert.deepEqual(result.perPackage, { kinetoast: 777 });
  });

  it("splits more than 128 unscoped packages into separate bulk batches", async () => {
    const batchSizes: number[] = [];
    const packages = Array.from({ length: 130 }, (_, index) => `pkg-${index}`);

    const mockFetch: FetchLike = async (input) => {
      const url = String(input);
      const segment = url.slice(url.lastIndexOf("/") + 1);
      const names = segment.split(",").map((item) => decodeURIComponent(item));
      batchSizes.push(names.length);

      if (names.length === 1) {
        return new Response(JSON.stringify({ downloads: 10 }), { status: 200 });
      }

      const body: Record<string, { downloads: number }> = {};
      for (const name of names) {
        body[name] = { downloads: 10 };
      }
      return new Response(JSON.stringify(body), { status: 200 });
    };

    const result = await fetchTotalDownloads(
      packages,
      "2026-01-01",
      "2026-01-10",
      mockFetch,
      { maxRetries: 0 }
    );

    assert.deepEqual(batchSizes, [128, 2]);
    assert.equal(result.totalDownloads, 1300);
  });
});
