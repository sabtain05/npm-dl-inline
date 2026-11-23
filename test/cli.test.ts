import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { parseCliArgs } from "../src/cli-args.js";
import { run } from "../src/index.js";
import type { FetchLike } from "../src/types.js";

describe("cli and runner", () => {
  it("parses default options and custom flags", () => {
    const defaults = parseCliArgs([]);
    assert.deepEqual(defaults, {
      user: "sabtain05",
      start: "2026-01-01",
      readme: "README.md",
      format: "comma",
      dryRun: false,
      help: false,
      version: false
    });

    const parsed = parseCliArgs([
      "--user",
      "octocat",
      "--start=2025-06-01",
      "-r",
      "docs/PROFILE.md",
      "--format=raw",
      "--dry-run"
    ]);
    assert.deepEqual(parsed, {
      user: "octocat",
      start: "2025-06-01",
      readme: "docs/PROFILE.md",
      format: "raw",
      dryRun: true,
      help: false,
      version: false
    });
  });

  it("rejects unknown flags and invalid formats", () => {
    assert.throws(() => parseCliArgs(["--unknown"]), /Unknown argument/);
    assert.throws(() => parseCliArgs(["--format", "compact"]), /Invalid value/);
    assert.throws(() => parseCliArgs(["--user"]), /Missing value/);
  });

  it("runs end-to-end and respects dryRun without modifying the README file", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "npm-dl-run-"));
    const readmePath = path.join(tempDir, "README.md");
    const initialContent =
      "My packages received over **<!-- npm-dl:start -->5,000<!-- npm-dl:end --> downloads** on NPM.\n";

    const mockFetch: FetchLike = async (input) => {
      const url = String(input);
      if (url.includes("/-/v1/search")) {
        return new Response(
          JSON.stringify({
            total: 2,
            objects: [
              { package: { name: "kinetoast" } },
              { package: { name: "failover-boundary" } }
            ]
          }),
          { status: 200 }
        );
      }
      return new Response(
        JSON.stringify({
          "failover-boundary": { downloads: 2100 },
          kinetoast: { downloads: 3320 }
        }),
        { status: 200 }
      );
    };

    try {
      await writeFile(readmePath, initialContent, "utf8");

      const dryResult = await run({
        user: "sabtain05",
        start: "2026-01-01",
        end: "2026-06-01",
        readme: readmePath,
        format: "comma",
        dryRun: true,
        fetchImpl: mockFetch,
        retry: { maxRetries: 0 }
      });

      assert.equal(dryResult.totalDownloads, 5420);
      assert.equal(dryResult.formattedTotal, "5,420");
      assert.equal(dryResult.updated, false);
      assert.equal(await readFile(readmePath, "utf8"), initialContent);

      const writeResult = await run({
        user: "sabtain05",
        start: "2026-01-01",
        end: "2026-06-01",
        readme: readmePath,
        format: "comma",
        dryRun: false,
        fetchImpl: mockFetch,
        retry: { maxRetries: 0 }
      });

      assert.equal(writeResult.updated, true);
      assert.equal(
        await readFile(readmePath, "utf8"),
        "My packages received over **<!-- npm-dl:start -->5,420<!-- npm-dl:end --> downloads** on NPM.\n"
      );
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
