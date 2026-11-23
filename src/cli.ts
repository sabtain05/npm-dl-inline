#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { formatHelpText, parseCliArgs } from "./cli-args.js";
import { run } from "./index.js";

function resolveRealPath(targetPath: string): string {
  try {
    return realpathSync(targetPath);
  } catch {
    return path.resolve(targetPath);
  }
}

async function readPackageVersion(): Promise<string> {
  const currentFile = fileURLToPath(import.meta.url);
  const packageJsonPath = path.resolve(path.dirname(currentFile), "../../package.json");
  const raw = await readFile(packageJsonPath, "utf8");
  const parsed = JSON.parse(raw) as { version?: unknown };
  return typeof parsed.version === "string" ? parsed.version : "0.0.0";
}

export async function main(argv: readonly string[] = process.argv.slice(2)): Promise<number> {
  const options = parseCliArgs(argv);

  if (options.help) {
    process.stdout.write(`${formatHelpText()}\n`);
    return 0;
  }

  if (options.version) {
    const version = await readPackageVersion();
    process.stdout.write(`${version}\n`);
    return 0;
  }

  const result = await run({
    user: options.user,
    start: options.start,
    readme: options.readme,
    format: options.format,
    dryRun: options.dryRun
  });

  if (options.dryRun) {
    process.stdout.write(
      `[dry-run] Maintainer: ${result.user} | Packages: ${result.packages.length} | Range: ${result.startDate}..${result.endDate} | Total downloads: ${result.formattedTotal}\n`
    );
    return 0;
  }

  const statusLabel = result.updated ? "Updated" : "Already up to date";
  process.stdout.write(
    `${statusLabel} ${result.readmePath} (${result.packages.length} packages, ${result.startDate}..${result.endDate}): ${result.formattedTotal} downloads\n`
  );
  return 0;
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  resolveRealPath(process.argv[1]) === resolveRealPath(fileURLToPath(import.meta.url));

if (isDirectExecution) {
  main().then(
    (code) => {
      process.exitCode = code;
    },
    (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`Error: ${message}\n`);
      process.exitCode = 1;
    }
  );
}
