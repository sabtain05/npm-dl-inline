import { readFile, writeFile } from "node:fs/promises";
import type { DownloadFormat } from "./types.js";

export const START_MARKER = "<!-- npm-dl:start -->";
export const END_MARKER = "<!-- npm-dl:end -->";

const COMMA_FORMATTER = new Intl.NumberFormat("en-US");

export function formatDownloadCount(
  total: number,
  format: DownloadFormat = "comma"
): string {
  if (!Number.isFinite(total) || total < 0) {
    throw new Error(`Download count must be a non-negative finite number, received ${total}.`);
  }
  const rounded = Math.trunc(total);
  if (format === "raw") {
    return String(rounded);
  }
  if (format === "comma") {
    return COMMA_FORMATTER.format(rounded);
  }
  throw new Error(`Unsupported format "${String(format)}". Expected "comma" or "raw".`);
}

export function replaceReadmeDownloads(
  content: string,
  formattedTotal: string
): string {
  const startIndex = content.indexOf(START_MARKER);
  if (startIndex === -1) {
    throw new Error(
      `Missing start marker "${START_MARKER}". Add "${START_MARKER}0${END_MARKER}" to your README file.`
    );
  }

  const endIndex = content.indexOf(END_MARKER);
  if (endIndex === -1) {
    throw new Error(
      `Missing end marker "${END_MARKER}". Add "${START_MARKER}0${END_MARKER}" to your README file.`
    );
  }

  const contentStart = startIndex + START_MARKER.length;
  if (endIndex < contentStart) {
    throw new Error(
      `Invalid marker order: "${END_MARKER}" appears before "${START_MARKER}".`
    );
  }

  return `${content.slice(0, contentStart)}${formattedTotal}${content.slice(endIndex)}`;
}

export async function updateReadmeDownloads(
  readmePath: string,
  formattedTotal: string
): Promise<boolean> {
  const original = await readFile(readmePath, "utf8");
  const updated = replaceReadmeDownloads(original, formattedTotal);
  if (updated === original) {
    return false;
  }
  await writeFile(readmePath, updated, "utf8");
  return true;
}
