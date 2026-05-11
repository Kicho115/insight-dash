import { liteClient, type LiteClient } from "algoliasearch/lite";

/** Fixed Algolia index for this app. */
export const ALGOLIA_DEFAULT_INDEX_NAME = "Businesses" as const;

export type AlgoliaPublicEnv = {
    applicationId: string;
    searchOnlyApiKey: string;
};

export function requireAlgoliaPublicEnv(): AlgoliaPublicEnv {
    const applicationId = process.env.NEXT_PUBLIC_ALGOLIA_APPLICATION_ID?.trim();
    const searchOnlyApiKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_ONLY_API_KEY?.trim();

    if (!applicationId || !searchOnlyApiKey) {
        throw new Error(
            "Algolia: set NEXT_PUBLIC_ALGOLIA_APPLICATION_ID and NEXT_PUBLIC_ALGOLIA_SEARCH_ONLY_API_KEY (see .env.local.example).",
        );
    }

    return { applicationId, searchOnlyApiKey };
}

let searchClientSingleton: LiteClient | undefined;

/**
 * Singleton Algolia lite client (search / recommend only; smaller bundle than the full client).
 * Use env vars validated by {@link requireAlgoliaPublicEnv}.
 */
export function getAlgoliaSearchClient(): LiteClient {
    if (!searchClientSingleton) {
        const { applicationId, searchOnlyApiKey } = requireAlgoliaPublicEnv();
        searchClientSingleton = liteClient(applicationId, searchOnlyApiKey);
    }
    return searchClientSingleton;
}

/** Algolia index name (fixed: {@link ALGOLIA_DEFAULT_INDEX_NAME}). */
export function getDefaultAlgoliaIndexName(): typeof ALGOLIA_DEFAULT_INDEX_NAME {
    return ALGOLIA_DEFAULT_INDEX_NAME;
}
