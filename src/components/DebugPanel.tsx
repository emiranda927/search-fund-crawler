import React from 'react';
import { Bug, ChevronDown, AlertCircle, Link as LinkIcon, Clock, Globe, Activity } from 'lucide-react';
import { CrawlStats } from '../types';

interface DebugPanelProps {
  url: string;
  depth?: number;
  pagesInDomain?: number;
  crawlStats?: CrawlStats;
  responseTime?: number;
  httpStatus?: number;
}

export default function DebugPanel({ 
  url, 
  depth, 
  pagesInDomain, 
  crawlStats,
  responseTime,
  httpStatus
}: DebugPanelProps) {
  if (!crawlStats) return null;

  const domain = new URL(url).hostname;
  const isSuccessStatus = httpStatus && httpStatus >= 200 && httpStatus < 300;

  return (
    <details className="mt-4 text-sm border-t pt-4">
      <summary className="cursor-pointer text-gray-600 flex items-center bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors">
        <Bug className="h-4 w-4 mr-2 text-gray-500" />
        <span className="font-medium">Crawl Debug Information</span>
        <div className="ml-auto flex items-center gap-4 text-xs">
          {responseTime && (
            <div className="flex items-center gap-1" title="Response Time">
              <Clock className="h-3 w-3" />
              <span>{responseTime}ms</span>
            </div>
          )}
          {httpStatus && (
            <div 
              className={`flex items-center gap-1 ${
                isSuccessStatus ? 'text-green-600' : 'text-red-600'
              }`}
              title="HTTP Status"
            >
              <Activity className="h-3 w-3" />
              <span>{httpStatus}</span>
            </div>
          )}
          <div className="flex items-center gap-1" title="Found Links">
            <LinkIcon className="h-3 w-3" />
            <span>{crawlStats.foundLinks} links</span>
          </div>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </div>
      </summary>
      
      <div className="mt-3 space-y-4">
        {/* Domain Overview */}
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
            <Globe className="h-4 w-4 mr-2 text-blue-500" />
            Domain Overview: {domain}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Crawl Depth" value={depth || 0} />
            <Stat label="Pages Found" value={pagesInDomain || 0} />
            <Stat 
              label="HTTP Status" 
              value={httpStatus || '-'}
              className={isSuccessStatus ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}
            />
            <Stat 
              label="Response Time" 
              value={`${responseTime || 0}ms`}
              className={responseTime && responseTime < 1000 ? 'bg-green-50 border-green-100' : 'bg-yellow-50 border-yellow-100'}
            />
          </div>
        </div>

        {/* Crawl Statistics */}
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Crawl Statistics</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat 
              label="Total Pages" 
              value={crawlStats.totalPages}
              className="bg-blue-50 border-blue-100"
            />
            <Stat 
              label="Successful" 
              value={crawlStats.successfulPages}
              className="bg-green-50 border-green-100"
            />
            <Stat 
              label="Failed" 
              value={crawlStats.failedPages}
              className="bg-red-50 border-red-100"
            />
            <Stat 
              label="Skipped" 
              value={crawlStats.skippedPages}
              className="bg-yellow-50 border-yellow-100"
            />
          </div>
        </div>

        {/* Errors Section */}
        {crawlStats.errors.length > 0 && (
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
              Crawl Errors
            </h4>
            <div className="space-y-2">
              {crawlStats.errors.map((error, index) => (
                <div 
                  key={index}
                  className="text-xs bg-red-50 text-red-700 p-3 rounded-md flex items-start"
                >
                  <span className="mr-2">•</span>
                  <div>
                    <div className="font-medium">{new URL(error.url).pathname}</div>
                    <div className="text-red-600 mt-1">{error.error}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Crawled Pages */}
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Crawled Pages</h4>
          <div className="max-h-48 overflow-y-auto">
            <div className="space-y-1">
              {Array.isArray(crawlStats.crawledPages) && crawlStats.crawledPages.map((page, index) => (
                <div 
                  key={index}
                  className="text-xs p-2 hover:bg-gray-50 rounded-md flex items-center"
                >
                  <LinkIcon className="h-3 w-3 mr-2 text-gray-400" />
                  <span className="text-gray-600 font-medium">{new URL(page).pathname}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </details>
  );
}

function Stat({ label, value, className = '' }: { label: string; value: string | number; className?: string }) {
  return (
    <div className={`p-3 rounded-md border ${className}`}>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}