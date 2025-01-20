// Configuration for web crawling and analysis
export const CRAWL_CONFIG = {
    maxDepth: 3, // How deep to crawl from initial URLs
    maxPagesPerDomain: 50, // Maximum pages to crawl per domain
    checkInsurance: true, // Whether to check for insurance information
    sameDomainOnly: true, // Only crawl pages on the same domain
    concurrentRequests: 5, // Maximum concurrent requests
    requestTimeout: 30000, // Request timeout in milliseconds
    retryAttempts: 3, // Number of retry attempts for failed requests
};
// Validation limits
export const VALIDATION_LIMITS = {
    maxUrls: 1000, // Maximum number of URLs that can be analyzed at once
    maxKeywords: 50, // Maximum number of keywords allowed
    maxKeywordLength: 100 // Maximum length of each keyword
};
