import { load as cheerioLoad } from 'cheerio';
import pLimit from 'p-limit';
import { z } from 'zod';
import { INSURANCE_TERMS } from './constants.js';
import { AnalysisResult, CrawlStats, KeywordMatch } from '../types.js';
import { fetchWithRetry } from './utils.js';
import { sanitizeHtml } from './validation.js';
import { MemoryManager } from './memory.js';
import { analyzeInsurance } from './insurance.js';
import { CRAWL_CONFIG } from './config.js';

interface CrawlState {
  visited: Set<string>;
  domainPageCounts: Map<string, number>;
  domainResults: Map<string, {
    baseUrl: string;
    hasKeywords: boolean;
    confidenceScores: number[];
    matches: Map<string, KeywordMatch>;
    insuranceMatches: Set<string>;
    insuranceConfidence: number;
    crawledPages: Set<string>;
    errors: Set<string>;
  }>;
}

function getDomain(url: string): string {
  return new URL(url).hostname;
}

function shouldCrawlUrl(url: string, state: CrawlState, startDomain: string): boolean {
  const domain = getDomain(url);
  const domainCount = state.domainPageCounts.get(domain) || 0;
  
  return (
    !state.visited.has(url) &&
    domainCount < CRAWL_CONFIG.maxPagesPerDomain &&
    (!CRAWL_CONFIG.sameDomainOnly || domain === startDomain)
  );
}

function mergeMatches(existing: KeywordMatch[], newMatches: KeywordMatch[]): KeywordMatch[] {
  const matchMap = new Map<string, KeywordMatch>();
  
  [...existing, ...newMatches].forEach(match => {
    const existing = matchMap.get(match.keyword);
    if (existing) {
      matchMap.set(match.keyword, {
        keyword: match.keyword,
        frequency: existing.frequency + match.frequency,
        context: match.context || existing.context
      });
    } else {
      matchMap.set(match.keyword, match);
    }
  });
  
  return Array.from(matchMap.values());
}

export async function analyzeWebsites({
  urls,
  keywords,
  checkInsurance = CRAWL_CONFIG.checkInsurance,
  onProgress,
  maxDepth = CRAWL_CONFIG.maxDepth,
  sameDomainOnly = CRAWL_CONFIG.sameDomainOnly
}: {
  urls: string[];
  keywords: string[];
  checkInsurance?: boolean;
  onProgress?: (progress: number) => void;
  maxDepth?: number;
  sameDomainOnly?: boolean;
}): Promise<AnalysisResult[]> {
  const memoryManager = new MemoryManager();
  const limit = pLimit(CRAWL_CONFIG.concurrentRequests);
  
  const state: CrawlState = {
    visited: new Set<string>(),
    domainPageCounts: new Map<string, number>(),
    domainResults: new Map()
  };

  interface QueueItem {
    url: string;
    depth: number;
    startDomain: string;
  }

  const queue: QueueItem[] = urls.map(url => ({
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

      const domain = getDomain(url);
      state.visited.add(url);
      state.domainPageCounts.set(domain, (state.domainPageCounts.get(domain) || 0) + 1);

      let domainData = state.domainResults.get(domain);
      if (!domainData) {
        domainData = {
          baseUrl: url,
          hasKeywords: false,
          confidenceScores: [],
          matches: new Map(),
          insuranceMatches: new Set(),
          insuranceConfidence: 0,
          crawledPages: new Set(),
          errors: new Set()
        };
        state.domainResults.set(domain, domainData);
      }

      try {
        const response = await fetchWithRetry(url);
        const html = await response.text();
        const cleanHtml = sanitizeHtml(html);
        const $ = cheerioLoad(cleanHtml);

        // Extract and analyze content
        const content = extractContent($);
        const analysis = analyzeContent(content, keywords);
        
        // Update domain data
        domainData.hasKeywords = domainData.hasKeywords || analysis.hasKeywords;
        domainData.confidenceScores.push(analysis.confidenceScore);
        analysis.matches.forEach(match => {
          domainData.matches.set(match.keyword, match);
        });
        
        // Check for insurance if enabled
        if (checkInsurance) {
          const insuranceStatus = analyzeInsurance(content);
          if (insuranceStatus.acceptsInsurance) {
            insuranceStatus.matches.forEach(match => {
              domainData.insuranceMatches.add(match.term);
            });
            domainData.insuranceConfidence = Math.max(
              domainData.insuranceConfidence,
              insuranceStatus.confidence
            );
          }
        }

        domainData.crawledPages.add(url);

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

        if (onProgress) {
          onProgress(state.visited.size / (urls.length * CRAWL_CONFIG.maxPagesPerDomain));
        }

      } catch (error) {
        domainData.errors.add(url);
      }

      if (memoryManager.isWarningLevel()) {
        await memoryManager.cleanup();
      }
    }));

    await Promise.all(tasks);
  }
  
  return consolidateResults(state);
}

function extractContent($: ReturnType<typeof cheerioLoad>): string {
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

function extractLinks($: ReturnType<typeof cheerioLoad>, baseUrl: string): string[] {
  const links = new Set<string>();
  
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      try {
        const url = new URL(href, baseUrl).toString();
        if (url.startsWith('http')) {
          links.add(url);
        }
      } catch {
        // Ignore invalid URLs
      }
    }
  });

  return Array.from(links);
}

function analyzeContent(content: string, keywords: string[]): {
  hasKeywords: boolean;
  confidenceScore: number;
  matches: KeywordMatch[];
} {
  const matches: KeywordMatch[] = [];
  
  keywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'g');
    const frequency = (content.toLowerCase().match(regex) || []).length;
    
    if (frequency > 0) {
      const contextMatches = content.toLowerCase().match(
        new RegExp(`.{0,100}\\b${keyword.toLowerCase()}\\b.{0,100}`, 'gi')
      );
      
      matches.push({
        keyword,
        frequency,
        context: contextMatches?.[0]?.trim()
      });
    }
  });

  const totalMatches = matches.reduce((sum, m) => sum + m.frequency, 0);

  return {
    hasKeywords: matches.length > 0,
    confidenceScore: Math.min(totalMatches / (keywords.length * 2), 1),
    matches
  };
}

function consolidateResults(state: CrawlState): AnalysisResult[] {
  return Array.from(state.domainResults.entries()).map(([domain, data]) => ({
    url: data.baseUrl,
    hasKeywords: data.hasKeywords,
    confidenceScore: data.confidenceScores.length > 0
      ? data.confidenceScores.reduce((a, b) => a + b, 0) / data.confidenceScores.length
      : 0,
    matches: Array.from(data.matches.values()),
    analysisStatus: data.hasKeywords ? 'success' : 
                   data.errors.size > 0 ? 'error' : 'success',
    insuranceStatus: {
      acceptsInsurance: data.insuranceConfidence > 0,
      confidence: data.insuranceConfidence,
      matches: Array.from(data.insuranceMatches).map(term => ({
        term,
        frequency: 1,
        type: 'statement' as const
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
  }));
}