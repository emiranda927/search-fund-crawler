import React from 'react';
import { PieChart, BarChart2, Percent, Link as LinkIcon, Clock, Bug, AlertCircle } from 'lucide-react';
import { AnalysisResult } from '../types';

interface StatisticsProps {
  results: AnalysisResult[];
}

export default function Statistics({ results }: StatisticsProps) {
  const stats = {
    total: results.length,
    withKeywords: results.filter((r) => r.hasKeywords).length,
    percentage: (
      (results.filter((r) => r.hasKeywords).length / results.length) *
      100
    ).toFixed(1),
  };

  // Aggregate debug statistics with proper type checking and defaults
  const debugStats = results.reduce((acc, result) => {
    const crawlStats = result.statusDetails?.crawlStats;
    
    if (crawlStats) {
      return {
        totalPagesFound: acc.totalPagesFound + (crawlStats.totalPages || 0),
        successfulPages: acc.successfulPages + (crawlStats.successfulPages || 0),
        failedPages: acc.failedPages + (crawlStats.failedPages || 0),
        skippedPages: acc.skippedPages + (crawlStats.skippedPages || 0),
        totalLinks: acc.totalLinks + (crawlStats.foundLinks || 0),
        errors: acc.errors + (crawlStats.errors?.length || 0)
      };
    }
    return acc;
  }, {
    totalPagesFound: 0,
    successfulPages: 0,
    failedPages: 0,
    skippedPages: 0,
    totalLinks: 0,
    errors: 0
  });

  return (
    <div className="space-y-6 mb-8">
      {/* Analysis Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Websites</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
            </div>
            <PieChart className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">With Keywords</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.withKeywords}
              </p>
            </div>
            <BarChart2 className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.percentage}%
              </p>
            </div>
            <Percent className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Crawl Statistics */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Bug className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">Crawl Statistics</h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            icon={<PieChart className="h-5 w-5 text-blue-500" />}
            label="Total Pages"
            value={debugStats.totalPagesFound}
          />
          <StatCard
            icon={<BarChart2 className="h-5 w-5 text-green-500" />}
            label="Successful"
            value={debugStats.successfulPages}
          />
          <StatCard
            icon={<AlertCircle className="h-5 w-5 text-red-500" />}
            label="Failed"
            value={debugStats.failedPages}
          />
          <StatCard
            icon={<Clock className="h-5 w-5 text-yellow-500" />}
            label="Skipped"
            value={debugStats.skippedPages}
          />
          <StatCard
            icon={<LinkIcon className="h-5 w-5 text-indigo-500" />}
            label="Total Links"
            value={debugStats.totalLinks}
          />
          <StatCard
            icon={<AlertCircle className="h-5 w-5 text-orange-500" />}
            label="Errors"
            value={debugStats.errors}
          />
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
}

function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm font-medium text-gray-600">{label}</span>
      </div>
      <p className="text-xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}