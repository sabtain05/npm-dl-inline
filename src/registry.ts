import { fetchWithRetry } from "./http.js";
import type { FetchLike, RetryOptions } from "./types.js";

const REGISTRY_SEARCH_URL = "https://registry.npmjs.org/-/v1/search";
const PAGE_SIZE = 250;

interface SearchResultObject {
  readonly package?: {
    readonly name?: unknown;
  };
}

interface RegistrySearchResponse {
  readonly objects?: readonly SearchResultObject[];
  readonly total?: unknown;
}

export async function discoverMaintainerPackages(
  username: string,
  fetchImpl: FetchLike = fetch,
  retry?: RetryOptions
): Promise<string[]> {
  const trimmedUser = username.trim();
  if (!trimmedUser) {
    throw new Error("Maintainer username must be a non-empty string.");
  }

  const discovered = new Set<string>();
  let offset = 0;

  while (true) {
    const query = encodeURIComponent(`maintainer:${trimmedUser}`);
    const url = `${REGISTRY_SEARCH_URL}?text=${query}&size=${PAGE_SIZE}&from=${offset}`;
    const response = await fetchWithRetry(url, fetchImpl, retry);

    if (!response.ok) {
      throw new Error(
        `npm registry search failed with HTTP ${response.status} for maintainer "${trimmedUser}".`
      );
    }

    const payload = (await response.json()) as RegistrySearchResponse;
    const objects = Array.isArray(payload.objects) ? payload.objects : [];

    for (const item of objects) {
      const name = item?.package?.name;
      if (typeof name === "string" && name.length > 0) {
        discovered.add(name);
      }
    }

    const total = typeof payload.total === "number" ? payload.total : 0;
    offset += objects.length;

    if (objects.length === 0 || offset >= total) {
      break;
    }
  }

  return Array.from(discovered).sort();
}
