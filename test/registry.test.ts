import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { discoverMaintainerPackages } from "../src/registry.js";
import type { FetchLike } from "../src/types.js";

describe("discoverMaintainerPackages", () => {
  it("paginates through all search pages and deduplicates sorted package names", async () => {
    const requestedUrls: string[] = [];

    const mockFetch: FetchLike = async (input) => {
      const url = String(input);
      requestedUrls.push(url);

      if (url.includes("from=0")) {
        return new Response(
          JSON.stringify({
            total: 3,
            objects: [
              { package: { name: "kinetoast" } },
              { package: { name: "failover-boundary" } }
            ]
          }),
          { status: 200 }
        );
      }

      if (url.includes("from=2")) {
        return new Response(
          JSON.stringify({
            total: 3,
            objects: [
              { package: { name: "kinetoast" } },
              { package: { name: "@sabtain05/cli-kit" } }
            ]
          }),
          { status: 200 }
        );
      }

      return new Response(JSON.stringify({ total: 3, objects: [] }), { status: 200 });
    };

    const packages = await discoverMaintainerPackages("sabtain05", mockFetch, {
      maxRetries: 0
    });

    assert.deepEqual(packages, [
      "@sabtain05/cli-kit",
      "failover-boundary",
      "kinetoast"
    ]);
    assert.equal(requestedUrls.length, 2);
    assert.match(
      requestedUrls[0] ?? "",
      /https:\/\/registry\.npmjs\.org\/-\/v1\/search\?text=maintainer%3Asabtain05&size=250&from=0/
    );
  });

  it("returns an empty array when maintainer has no packages", async () => {
    const mockFetch: FetchLike = async () =>
      new Response(JSON.stringify({ total: 0, objects: [] }), { status: 200 });

    const packages = await discoverMaintainerPackages("new-user", mockFetch, {
      maxRetries: 0
    });

    assert.deepEqual(packages, []);
  });

  it("throws on empty username", async () => {
    await assert.rejects(
      () => discoverMaintainerPackages("   "),
      /non-empty string/
    );
  });
});
