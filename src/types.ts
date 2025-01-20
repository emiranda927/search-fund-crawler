// Analysis and Filter Types
export interface AnalysisState {
  isAnalyzing: boolean;
  progress: number;
  error: string | null;
  canCancel: boolean;
}

export interface AnalysisOptions {
  urls: string[];
  keywords: string[];
  checkInsurance: boolean;
  maxDepth?: number;
  sameDomainOnly?: boolean;
}

export interface InsuranceAnalysisOptions {
  minConfidence: number;
  requireMultipleProviders: boolean;
  requireProximity: boolean;
}

export interface FilterOptions {
  classification: 'all' | 'yes' | 'no' | 'error' | 'partial';
  minConfidence: number;
  insuranceFilter: 'all' | 'accepts' | 'unknown';
  sortBy?: 'confidence' | 'date' | 'relevance';
  sortDirection?: 'asc' | 'desc';
}

// Match Types
export interface KeywordMatch {
  keyword: string;
  frequency: number;
  context?: string;
}

export interface InsuranceMatch {
  term: string;
  frequency: number;
  context?: string;
  type: 'statement' | 'provider';
  proximityScore?: number;
}

// Statistics Types
export interface CrawlStats {
  totalPages: number;
  successfulPages: number;
  failedPages: number;
  skippedPages: number;
  foundLinks: number;
  crawledPages: string[];
  errors: Array<{
    url: string;
    error: string;
  }>;
}

// Result Types
export interface AnalysisResult {
  url: string;
  hasKeywords: boolean;
  confidenceScore: number;
  matches: KeywordMatch[];
  error?: string;
  analysisStatus?: 'success' | 'error' | 'partial';
  insuranceStatus?: {
    acceptsInsurance: boolean;
    confidence: number;
    matches: InsuranceMatch[];
    providers?: string[];
    statements?: string[];
  };
  statusDetails?: {
    httpStatus?: number;
    errorType?: string;
    retryCount?: number;
    responseTime?: number;
    pagesInDomain?: number;
    depth?: number;
    crawlStats?: CrawlStats;
    rateLimitInfo?: {
      remaining: number;
      resetTime: number;
    };
  };
  timestamp?: number;
}