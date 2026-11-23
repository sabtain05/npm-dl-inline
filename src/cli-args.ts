import type { CliOptions, DownloadFormat } from "./types.js";

export const DEFAULT_USER = "sabtain05";
export const DEFAULT_START_DATE = "2026-01-01";
export const DEFAULT_README_PATH = "README.md";
export const DEFAULT_FORMAT: DownloadFormat = "comma";

function requireOptionValue(
  argv: readonly string[],
  index: number,
  flag: string
): string {
  const value = argv[index];
  if (value === undefined || value.startsWith("-")) {
    throw new Error(`Missing value for option "${flag}".`);
  }
  return value;
}

function parseFormat(value: string): DownloadFormat {
  if (value === "comma" || value === "raw") {
    return value;
  }
  throw new Error(`Invalid value "${value}" for --format. Expected "comma" or "raw".`);
}

export function parseCliArgs(argv: readonly string[]): CliOptions {
  let user = DEFAULT_USER;
  let start = DEFAULT_START_DATE;
  let readme = DEFAULT_README_PATH;
  let format: DownloadFormat = DEFAULT_FORMAT;
  let dryRun = false;
  let help = false;
  let version = false;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === undefined) {
      continue;
    }

    if (token === "--help" || token === "-h") {
      help = true;
      continue;
    }

    if (token === "--version" || token === "-v") {
      version = true;
      continue;
    }

    if (token === "--dry-run") {
      dryRun = true;
      continue;
    }

    const equalsIndex = token.indexOf("=");
    const flag = equalsIndex === -1 ? token : token.slice(0, equalsIndex);
    const inlineValue = equalsIndex === -1 ? undefined : token.slice(equalsIndex + 1);

    if (flag === "--user" || flag === "-u") {
      user = inlineValue ?? requireOptionValue(argv, index + 1, flag);
      if (inlineValue === undefined) {
        index += 1;
      }
      continue;
    }

    if (flag === "--start" || flag === "-s") {
      start = inlineValue ?? requireOptionValue(argv, index + 1, flag);
      if (inlineValue === undefined) {
        index += 1;
      }
      continue;
    }

    if (flag === "--readme" || flag === "-r") {
      readme = inlineValue ?? requireOptionValue(argv, index + 1, flag);
      if (inlineValue === undefined) {
        index += 1;
      }
      continue;
    }

    if (flag === "--format" || flag === "-f") {
      const rawFormat = inlineValue ?? requireOptionValue(argv, index + 1, flag);
      format = parseFormat(rawFormat);
      if (inlineValue === undefined) {
        index += 1;
      }
      continue;
    }

    throw new Error(`Unknown argument "${token}". Run with --help for usage.`);
  }

  return {
    user,
    start,
    readme,
    format,
    dryRun,
    help,
    version
  };
}

export function formatHelpText(): string {
  return [
    "Usage: npm-dl-inline [options]",
    "",
    "Aggregate all-time npm downloads across all packages by a maintainer",
    "and update a single inline number inside README.md.",
    "",
    "Options:",
    `  -u, --user <username>     npm maintainer username (default: "${DEFAULT_USER}")`,
    `  -s, --start <YYYY-MM-DD>  UTC start date for aggregation (default: "${DEFAULT_START_DATE}")`,
    `  -r, --readme <path>       Target README file path (default: "${DEFAULT_README_PATH}")`,
    `  -f, --format <comma|raw>  Number output format (default: "${DEFAULT_FORMAT}")`,
    "      --dry-run             Print totals without modifying the README file",
    "  -v, --version             Print CLI version",
    "  -h, --help                Show this help message"
  ].join("\n");
}
