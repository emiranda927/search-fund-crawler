// Configuration for web crawling and analysis
export const CRAWL_CONFIG = {
  maxDepth: 2,            // Reduced from 3 to improve speed
  maxPagesPerDomain: 20,  // Reduced from 50 to focus on most relevant pages
  checkInsurance: true,   // Whether to check for insurance information
  sameDomainOnly: true,   // Only crawl pages on the same domain
  concurrentRequests: 10, // Increased from 5 for better parallelization
  requestTimeout: 15000,  // Reduced timeout to 15 seconds
  retryAttempts: 2,      // Reduced from 3 to speed up failed requests
  minContentLength: 500,  // Skip pages with very little content
  maxContentLength: 500000, // Skip extremely large pages
};

// Validation limits
export const VALIDATION_LIMITS = {
  maxUrls: 1000,        // Maximum number of URLs that can be analyzed at once
  maxKeywords: 50,      // Maximum number of keywords allowed
  maxKeywordLength: 100 // Maximum length of each keyword
};