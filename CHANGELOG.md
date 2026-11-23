# Changelog

All notable changes to `npm-dl-inline` are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-22

### Added

- Automatic paginated discovery of all packages published by an npm maintainer via `/-/v1/search`.
- Contiguous 365-day UTC date chunking to aggregate all-time downloads past npm's 18-month range limit.
- Bulk download fetching for up to 128 unscoped packages per request and individual URL-encoded fetching for scoped packages (`@scope/pkg`).
- Exponential backoff retry logic with `Retry-After` support for transient `429` and `5xx` responses.
- Inline `README.md` marker replacement (`<!-- npm-dl:start -->` / `<!-- npm-dl:end -->`) with `comma` and `raw` formatting plus `--dry-run` mode.
- Full `node:test` unit test suite with zero runtime dependencies.
