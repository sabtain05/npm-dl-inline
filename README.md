# npm-dl-inline

Zero-dependency TypeScript CLI that automatically discovers every npm package published by a maintainer, aggregates all-time download counts across 365-day chunks, and updates a single inline number inside `README.md` (plain text only—no badges, no tables).

## Features

- **Zero runtime dependencies**: Built strictly on Node.js built-in modules (`node:fs`, `node:path`, `fetch`) targeting Node.js `>=18` with ESM.
- **Automatic package discovery**: Paginates through `https://registry.npmjs.org/-/v1/search?text=maintainer:<username>` so newly published packages are picked up automatically with zero hardcoding.
- **Accurate all-time aggregation**: Splits `[--start, today UTC]` into contiguous 365-day chunks to bypass npm's 18-month downloads API range limit.
- **Bulk + scoped support**: Batches up to 128 unscoped packages per bulk request and fetches scoped packages (`@scope/pkg`) individually with proper URL encoding.
- **Resilient HTTP retries**: Automatically retries transient `429` and `5xx` responses with exponential backoff and `Retry-After` support.
- **Safe inline replacement**: Replaces only the text between `<!-- npm-dl:start -->` and `<!-- npm-dl:end -->`, leaving surrounding Markdown untouched.

## Setup

Add the marker pair around the inline number in your `README.md`:

```markdown
My packages received over **<!-- npm-dl:start -->5,000<!-- npm-dl:end --> downloads** on NPM.
```

## CLI Usage

```bash
npx npm-dl-inline --user sabtain05 --start 2026-01-01 --readme README.md --format comma
```

### Options

| Flag | Alias | Default | Description |
| --- | --- | --- | --- |
| `--user <username>` | `-u` | `sabtain05` | npm maintainer username |
| `--start <YYYY-MM-DD>` | `-s` | `2026-01-01` | UTC start date for download aggregation |
| `--readme <path>` | `-r` | `README.md` | Path to the target Markdown file |
| `--format <comma\|raw>` | `-f` | `comma` | Output number format (`5,420` or `5420`) |
| `--dry-run` | | `false` | Print package count and total without modifying the file |
| `--version` | `-v` | | Print package version |
| `--help` | `-h` | | Display usage information |

### Dry Run

```bash
npx npm-dl-inline --user sabtain05 --start 2026-01-01 --dry-run
```

## GitHub Actions Automation

Schedule a daily workflow in your profile repository to keep the inline count fresh:

```yaml
name: Update npm Download Count

on:
  schedule:
    - cron: "0 0 * * *"
  workflow_dispatch:

permissions:
  contents: write

jobs:
  update-readme:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npx npm-dl-inline --user sabtain05 --start 2026-01-01 --readme README.md --format comma
      - run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git diff --quiet README.md || (git add README.md && git commit -m "chore: update npm download count" && git push)
```

## Programmatic API

```ts
import { run } from "npm-dl-inline";

const result = await run({
  user: "sabtain05",
  start: "2026-01-01",
  readme: "README.md",
  format: "comma",
  dryRun: false
});

console.log(result.packages.length, result.formattedTotal);
```

## Development

```bash
npm install
npm run typecheck
npm test
```

## License

MIT © [Sabtain Ali](https://github.com/sabtain05)
