import React from 'react';
import { ExternalLink, ChevronDown, AlertTriangle, AlertCircle, Download, Shield, AlertOctagon } from 'lucide-react';
import { AnalysisResult, FilterOptions, InsuranceMatch } from '../types';
import Papa from 'papaparse';
import DebugPanel from './DebugPanel';

interface ResultsTableProps {
  results: AnalysisResult[];
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
}

const MAX_DISPLAY_RESULTS = 100;

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

function mergeInsuranceStatus(
  existing: AnalysisResult['insuranceStatus'],
  newStatus: AnalysisResult['insuranceStatus']
): AnalysisResult['insuranceStatus'] {
  if (!existing) return newStatus;
  if (!newStatus) return existing;

  return {
    acceptsInsurance: existing.acceptsInsurance || newStatus.acceptsInsurance,
    confidence: Math.max(existing.confidence, newStatus.confidence),
    matches: [...existing.matches, ...newStatus.matches]
  };
}

function mergeStatusDetails(
  existing: AnalysisResult['statusDetails'],
  newDetails: AnalysisResult['statusDetails']
): AnalysisResult['statusDetails'] {
  if (!existing) return newDetails;
  if (!newDetails) return existing;

  return {
    ...existing,
    pagesInDomain: (existing.pagesInDomain || 0) + (newDetails.pagesInDomain || 0),
    crawlStats: existing.crawlStats && newDetails.crawlStats ? {
      totalPages: Math.max(existing.crawlStats.totalPages, newDetails.crawlStats.totalPages),
      successfulPages: existing.crawlStats.successfulPages + newDetails.crawlStats.successfulPages,
      failedPages: existing.crawlStats.failedPages + newDetails.crawlStats.failedPages,
      skippedPages: existing.crawlStats.skippedPages + newDetails.crawlStats.skippedPages,
      foundLinks: existing.crawlStats.foundLinks + newDetails.crawlStats.foundLinks,
      crawledPages: [...existing.crawlStats.crawledPages, ...newDetails.crawlStats.crawledPages],
      errors: [...existing.crawlStats.errors, ...newDetails.crawlStats.errors]
    } : existing.crawlStats || newDetails.crawlStats
  };
}

export default function ResultsTable({ results, filters, onFilterChange }: ResultsTableProps) {
  // Consolidate results by domain
  const consolidatedResults = React.useMemo(() => {
    const domainMap = new Map<string, AnalysisResult>();
    
    results.forEach(result => {
      const domain = new URL(result.url).hostname;
      const existing = domainMap.get(domain);
      
      if (!existing) {
        domainMap.set(domain, {
          ...result,
          analysisStatus: result.hasKeywords ? 'success' : result.analysisStatus
        });
      } else {
        domainMap.set(domain, {
          ...existing,
          hasKeywords: existing.hasKeywords || result.hasKeywords,
          confidenceScore: Math.max(existing.confidenceScore, result.confidenceScore),
          matches: mergeMatches(existing.matches, result.matches),
          insuranceStatus: mergeInsuranceStatus(existing.insuranceStatus, result.insuranceStatus),
          statusDetails: mergeStatusDetails(existing.statusDetails, result.statusDetails),
          analysisStatus: (existing.hasKeywords || result.hasKeywords) ? 'success' : 
                         (existing.analysisStatus === 'error' || result.analysisStatus === 'error') ? 'error' : 'success'
        });
      }
    });
    
    return Array.from(domainMap.values());
  }, [results]);

  const filteredResults = consolidatedResults.filter((result) => {
    if (filters.classification === 'error') {
      return result.analysisStatus === 'error';
    }
    if (filters.classification !== 'all') {
      if (filters.classification === 'yes' && !result.hasKeywords) return false;
      if (filters.classification === 'no' && result.hasKeywords) return false;
    }
    if (filters.insuranceFilter !== 'all') {
      if (filters.insuranceFilter === 'accepts' && !result.insuranceStatus?.acceptsInsurance) return false;
      if (filters.insuranceFilter === 'unknown' && result.insuranceStatus?.acceptsInsurance) return false;
    }
    return result.confidenceScore >= filters.minConfidence;
  });

  const displayResults = filteredResults.slice(0, MAX_DISPLAY_RESULTS);
  const hasMoreResults = filteredResults.length > MAX_DISPLAY_RESULTS;

  const getStatusBadge = (result: AnalysisResult) => {
    if (result.analysisStatus === 'error') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Failed
        </span>
      );
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        result.hasKeywords ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
      }`}>
        {result.hasKeywords ? 'Found' : 'Not Found'}
      </span>
    );
  };

  const getInsuranceBadge = (result: AnalysisResult) => {
    if (!result.insuranceStatus) return null;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ml-2 ${
        result.insuranceStatus.acceptsInsurance 
          ? 'bg-blue-100 text-blue-800' 
          : 'bg-gray-100 text-gray-800'
      }`}>
        <Shield className="w-3 h-3 mr-1" />
        {result.insuranceStatus.acceptsInsurance ? 'Accepts Insurance' : 'No Insurance Info'}
      </span>
    );
  };

  const exportToCSV = () => {
    const csvData = filteredResults.map(result => ({
      URL: result.url,
      Status: result.analysisStatus || 'success',
      'Has Keywords': result.hasKeywords ? 'Yes' : 'No',
      'Confidence Score': `${(result.confidenceScore * 100).toFixed(0)}%`,
      'Keywords Found': result.matches.map(m => `${m.keyword} (${m.frequency})`).join('; '),
      'Sample Context': result.matches.map(m => m.context).join(' | '),
      'Accepts Insurance': result.insuranceStatus?.acceptsInsurance ? 'Yes' : 'No',
      'Insurance Confidence': result.insuranceStatus ? `${(result.insuranceStatus.confidence * 100).toFixed(0)}%` : 'N/A',
      'Insurance Details': result.insuranceStatus?.matches.map(m => `${m.term} (${m.type})`).join('; ') || 'N/A',
      Error: result.error || ''
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'analysis_results.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="mt-8">
      <div className="mb-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-4">
          <select
            value={filters.classification}
            onChange={(e) =>
              onFilterChange({ ...filters, classification: e.target.value as any })
            }
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Results</option>
            <option value="yes">Has Keywords</option>
            <option value="no">No Keywords</option>
            <option value="error">Failed Analysis</option>
          </select>

          <select
            value={filters.insuranceFilter}
            onChange={(e) =>
              onFilterChange({ ...filters, insuranceFilter: e.target.value as any })
            }
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Insurance</option>
            <option value="accepts">Accepts Insurance</option>
            <option value="unknown">Unknown/No Insurance</option>
          </select>

          <button
            onClick={exportToCSV}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Export All Results ({filteredResults.length})
          </button>
        </div>
      </div>

      {hasMoreResults && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
          <AlertOctagon className="h-5 w-5 text-amber-500" />
          <div className="text-sm text-amber-800">
            Showing first {MAX_DISPLAY_RESULTS} results of {filteredResults.length} total. 
            <span className="font-medium ml-1">
              Please use the Export button above to access all results.
            </span>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                URL
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Confidence
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {displayResults.map((result, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-600 hover:text-blue-800"
                  >
                    {new URL(result.url).hostname}
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(result)}
                    {getInsuranceBadge(result)}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {(result.analysisStatus === 'success' || !result.analysisStatus) ? (
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-blue-600 rounded-full h-2"
                          style={{ width: `${result.confidenceScore * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">
                        {(result.confidenceScore * 100).toFixed(0)}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">N/A</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {result.error ? (
                    <div className="text-sm text-red-600">
                      {result.error}
                    </div>
                  ) : (
                    <>
                      <details className="cursor-pointer">
                        <summary className="text-sm text-gray-600 flex items-center">
                          <ChevronDown className="h-4 w-4 mr-1" />
                          {result.matches.length} keyword{result.matches.length !== 1 ? 's' : ''} found
                        </summary>
                        <div className="mt-2 space-y-3">
                          {result.matches.map((match, idx) => (
                            <div key={idx} className="pl-4 border-l-2 border-blue-200">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-blue-800">
                                  "{match.keyword}"
                                </span>
                                <span className="text-sm text-gray-500">
                                  Found {match.frequency} time{match.frequency !== 1 ? 's' : ''}
                                </span>
                              </div>
                              {match.context && (
                                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                                  <span className="font-medium text-gray-700">Context:</span>
                                  <p className="mt-1 italic">"{match.context}"</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </details>
                      
                      {result.statusDetails && (
                        <DebugPanel
                          url={result.url}
                          depth={result.statusDetails.depth}
                          pagesInDomain={result.statusDetails.pagesInDomain}
                          crawlStats={result.statusDetails.crawlStats}
                          responseTime={result.statusDetails.responseTime}
                          httpStatus={result.statusDetails.httpStatus}
                        />
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}