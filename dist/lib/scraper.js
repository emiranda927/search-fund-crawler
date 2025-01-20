import { load as cheerioLoad } from 'cheerio';
import pLimit from 'p-limit';
import { fetchWithRetry } from './utils.js';
import { sanitizeHtml } from './validation.js';
import { MemoryManager } from './memory.js';
import { analyzeInsurance } from './insurance.js';
import { CRAWL_CONFIG } from './config.js';
function getDomain(url) {
    return new URL(url).hostname;
}
function shouldCrawlUrl(url, state, startDomain) {
    const domain = getDomain(url);
    const domainCount = state.domainPageCounts.get(domain) || 0;
    return (!state.visited.has(url) &&
        domainCount < CRAWL_CONFIG.maxPagesPerDomain &&
        (!CRAWL_CONFIG.sameDomainOnly || domain === startDomain));
}
function consolidateResults(state) {
    const results = [];
    for (const [domain, data] of state.domainResults.entries()) {
        // Combine all keyword matches
        const consolidatedMatches = Array.from(data.matches.values());
        // Calculate average confidence score
        const avgConfidence = data.confidenceScores.length > 0
            ? data.confidenceScores.reduce((a, b) => a + b, 0) / data.confidenceScores.length
            : 0;
        // Create consolidated result
        const result = {
            url: data.baseUrl,
            hasKeywords: data.hasKeywords,
            confidenceScore: avgConfidence,
            matches: consolidatedMatches,
            analysisStatus: data.errors.size > 0 ? 'partial' : 'success',
            insuranceStatus: {
                // Set acceptsInsurance to true if there's any insurance confidence
                acceptsInsurance: data.insuranceConfidence > 0,
                confidence: data.insuranceConfidence,
                matches: Array.from(data.insuranceMatches).map(match => ({
                    term: match,
                    frequency: 1,
                    type: 'statement'
                }))
            },
            statusDetails: {
                depth: 0,
                pagesInDomain: data.crawledPages.size,
                crawlStats: {
                    totalPages: state.visited.size,
                    successfulPages: data.crawledPages.size - data.errors.size,
                    failedPages: data.errors.size,
                    skippedPages: 0,
                    foundLinks: data.crawledPages.size,
                    crawledPages: Array.from(data.crawledPages),
                    errors: Array.from(data.errors).map(url => ({
                        url,
                        error: 'Failed to analyze page'
                    }))
                }
            }
        };
        results.push(result);
    }
    return results;
}
export async function analyzeWebsites({ urls, keywords, checkInsurance = CRAWL_CONFIG.checkInsurance, onProgress, maxDepth = CRAWL_CONFIG.maxDepth, sameDomainOnly = CRAWL_CONFIG.sameDomainOnly }) {
    const memoryManager = new MemoryManager();
    const limit = pLimit(CRAWL_CONFIG.concurrentRequests);
    const state = {
        visited: new Set(),
        domainPageCounts: new Map(),
        domainResults: new Map()
    };
    // Initialize domain results for each starting URL
    for (const url of urls) {
        const domain = getDomain(url);
        if (!state.domainResults.has(domain)) {
            state.domainResults.set(domain, {
                baseUrl: url,
                matches: new Map(),
                insuranceMatches: new Set(),
                insuranceConfidence: 0,
                crawledPages: new Set(),
                errors: new Set(),
                confidenceScores: [],
                hasKeywords: false
            });
        }
    }
    const queue = urls.map(url => ({
        url,
        depth: 0,
        startDomain: getDomain(url)
    }));
    while (queue.length > 0) {
        const batch = queue.splice(0, CRAWL_CONFIG.concurrentRequests);
        const tasks = batch.map(item => limit(async () => {
            const { url, depth, startDomain } = item;
            if (!shouldCrawlUrl(url, state, startDomain)) {
                return;
            }
            state.visited.add(url);
            const domain = getDomain(url);
            state.domainPageCounts.set(domain, (state.domainPageCounts.get(domain) || 0) + 1);
            const domainData = state.domainResults.get(domain);
            if (!domainData)
                return;
            try {
                const response = await fetchWithRetry(url);
                const html = await response.text();
                const cleanHtml = sanitizeHtml(html);
                const $ = cheerioLoad(cleanHtml);
                // Extract and analyze content
                const content = extractContent($);
                const analysis = analyzeContent(content, keywords);
                // Update domain results
                domainData.crawledPages.add(url);
                domainData.confidenceScores.push(analysis.confidenceScore);
                domainData.hasKeywords = domainData.hasKeywords || analysis.hasKeywords;
                // Add new keyword matches
                for (const match of analysis.matches) {
                    const existing = domainData.matches.get(match.keyword);
                    if (!existing || existing.frequency < match.frequency) {
                        domainData.matches.set(match.keyword, match);
                    }
                }
                // Check for insurance if enabled
                if (checkInsurance) {
                    const insuranceStatus = analyzeInsurance(content);
                    // Update insurance confidence to the highest found
                    domainData.insuranceConfidence = Math.max(domainData.insuranceConfidence, insuranceStatus.confidence);
                    if (insuranceStatus.confidence > 0) {
                        insuranceStatus.matches.forEach(match => {
                            domainData.insuranceMatches.add(match.term);
                        });
                    }
                }
                // Extract links for crawling if within depth limit
                if (depth < maxDepth) {
                    const links = extractLinks($, url);
                    for (const link of links) {
                        if (shouldCrawlUrl(link, state, startDomain)) {
                            queue.push({
                                url: link,
                                depth: depth + 1,
                                startDomain
                            });
                        }
                    }
                }
            }
            catch (error) {
                domainData.errors.add(url);
            }
            if (memoryManager.isWarningLevel()) {
                await memoryManager.cleanup();
            }
            if (onProgress) {
                onProgress(state.visited.size / (urls.length * CRAWL_CONFIG.maxPagesPerDomain));
            }
        }));
        await Promise.all(tasks);
    }
    return consolidateResults(state);
}
// Helper functions remain the same
function extractContent($) {
    $('script, style, noscript, meta, link, iframe').remove();
    const contentSelectors = [
        'main',
        'article',
        'section',
        '.content',
        '#content',
        '.main',
        '#main',
        '[role="main"]',
        '.post-content',
        '.entry-content'
    ];
    let content = $(contentSelectors.join(', ')).text();
    if (!content.trim()) {
        $('header, footer, nav').remove();
        content = $('body').text();
    }
    return content.replace(/\s+/g, ' ').trim();
}
function extractLinks($, baseUrl) {
    const links = new Set();
    $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (href) {
            try {
                const url = new URL(href, baseUrl).toString();
                if (url.startsWith('http')) {
                    links.add(url);
                }
            }
            catch {
                // Ignore invalid URLs
            }
        }
    });
    return Array.from(links);
}
function analyzeContent(content, keywords) {
    const matches = keywords.map(keyword => {
        const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'g');
        const frequency = (content.toLowerCase().match(regex) || []).length;
        if (frequency > 0) {
            const contextMatches = content.toLowerCase().match(new RegExp(`.{0,100}\\b${keyword.toLowerCase()}\\b.{0,100}`, 'gi')) || [];
            return {
                keyword,
                frequency,
                context: contextMatches[0]?.trim()
            };
        }
        return null;
    }).filter((match) => match !== null);
    const totalMatches = matches.reduce((sum, m) => sum + m.frequency, 0);
    return {
        hasKeywords: matches.length > 0,
        confidenceScore: Math.min(totalMatches / (keywords.length * 2), 1),
        matches
    };
}
