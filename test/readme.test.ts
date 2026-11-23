import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import {
  formatDownloadCount,
  replaceReadmeDownloads,
  updateReadmeDownloads
} from "../src/readme.js";

describe("readme", () => {
  it("formats download counts in comma and raw modes", () => {
    assert.equal(formatDownloadCount(5420, "comma"), "5,420");
    assert.equal(formatDownloadCount(5420, "raw"), "5420");
    assert.equal(formatDownloadCount(0, "comma"), "0");
    assert.equal(formatDownloadCount(1234567, "comma"), "1,234,567");
  });

  it("replaces only the inline text between markers", () => {
    const input =
      "# Profile\n\nMy packages received over **<!-- npm-dl:start -->5,000<!-- npm-dl:end --> downloads** on NPM.\n";
    const output = replaceReadmeDownloads(input, "12,345");
    assert.equal(
      output,
      "# Profile\n\nMy packages received over **<!-- npm-dl:start -->12,345<!-- npm-dl:end --> downloads** on NPM.\n"
    );
  });

  it("throws actionable errors when markers are missing or misordered", () => {
    assert.throws(
      () => replaceReadmeDownloads("No markers here", "100"),
      /Missing start marker/
    );
    assert.throws(
      () => replaceReadmeDownloads("<!-- npm-dl:start -->100", "200"),
      /Missing end marker/
    );
    assert.throws(
      () =>
        replaceReadmeDownloads(
          "<!-- npm-dl:end -->100<!-- npm-dl:start -->",
          "200"
        ),
      /Invalid marker order/
    );
  });

  it("updates README file on disk and reports idempotency", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "npm-dl-inline-"));
    const readmePath = path.join(tempDir, "README.md");

    try {
      await writeFile(
        readmePath,
        "My packages received over **<!-- npm-dl:start -->5,000<!-- npm-dl:end --> downloads** on NPM.\n",
        "utf8"
      );

      const firstUpdate = await updateReadmeDownloads(readmePath, "6,250");
      assert.equal(firstUpdate, true);
      const afterFirst = await readFile(readmePath, "utf8");
      assert.equal(
        afterFirst,
        "My packages received over **<!-- npm-dl:start -->6,250<!-- npm-dl:end --> downloads** on NPM.\n"
      );

      const secondUpdate = await updateReadmeDownloads(readmePath, "6,250");
      assert.equal(secondUpdate, false);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
