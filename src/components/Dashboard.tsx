import React, { useState } from 'react';
import { Upload, Search, Shield, AlertCircle, XCircle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import toast from 'react-hot-toast';
import { AnalysisResult, FilterOptions } from '../types';
import { useAnalysis } from '../hooks/useAnalysis';
import ResultsTable from './ResultsTable';
import KeywordInput from './KeywordInput';
import Statistics from './Statistics';
import ProgressBar from './ProgressBar';
import ToggleSwitch from './ToggleSwitch';

export default function Dashboard() {
  const [urls, setUrls] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [checkInsurance, setCheckInsurance] = useState(true);
  const [filters, setFilters] = useState<FilterOptions>({
    classification: 'all',
    minConfidence: 0,
    insuranceFilter: 'all',
    sortBy: 'confidence',
    sortDirection: 'desc'
  });

  const {
    state: { isAnalyzing, progress, error, canCancel },
    results,
    startAnalysis,
    cancelAnalysis
  } = useAnalysis();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/csv': ['.csv'],
    },
    onDrop: async (acceptedFiles) => {
      try {
        const file = acceptedFiles[0];
        Papa.parse(file, {
          complete: (results) => {
            try {
              const parsedUrls = results.data
                .flat()
                .filter(Boolean)
                .map(url => {
                  const trimmedUrl = url.toString().trim();
                  if (!trimmedUrl.startsWith('http')) {
                    return `https://${trimmedUrl}`;
                  }
                  return trimmedUrl;
                })
                .filter(url => {
                  try {
                    new URL(url);
                    return true;
                  } catch {
                    return false;
                  }
                });

              if (parsedUrls.length === 0) {
                throw new Error('No valid URLs found in the CSV file');
              }

              setUrls(parsedUrls);
              toast.success(`Loaded ${parsedUrls.length} URLs`);
            } catch (error) {
              toast.error(error instanceof Error ? error.message : 'Invalid URL format');
            }
          },
          error: (error) => {
            toast.error(`Error parsing CSV: ${error.message}`);
          },
        });
      } catch (error) {
        toast.error('Failed to process the CSV file');
      }
    },
  });

  const handleStartAnalysis = async () => {
    if (!urls.length || !keywords.length) {
      toast.error('Please provide both URLs and keywords');
      return;
    }

    await startAnalysis({
      urls,
      keywords,
      checkInsurance
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Web Content Analyzer</h1>
        <p className="text-gray-600">Analyze websites for specific keywords and phrases</p>
      </div>

      {/* File Upload Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Upload URLs</h2>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-blue-400'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-600">
            {isDragActive
              ? 'Drop the CSV file here'
              : 'Drag and drop a CSV file, or click to select'}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            The CSV should contain a list of URLs to analyze
          </p>
        </div>
        {urls.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              {urls.length} URL{urls.length !== 1 ? 's' : ''} loaded
            </p>
          </div>
        )}
      </div>

      {/* Keywords Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Keywords</h2>
        <KeywordInput keywords={keywords} onChange={setKeywords} />
      </div>

      {/* Analysis Controls */}
      <div className="mb-8">
        <div className="flex flex-col gap-4">
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <button
                  onClick={handleStartAnalysis}
                  disabled={isAnalyzing || !urls.length || !keywords.length}
                  className={`flex items-center justify-center px-6 py-3 rounded-lg text-white font-medium transition-colors ${
                    isAnalyzing || !urls.length || !keywords.length
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <Search className="mr-2 h-5 w-5" />
                  {isAnalyzing ? 'Analyzing...' : 'Start Analysis'}
                </button>

                {canCancel && (
                  <button
                    onClick={cancelAnalysis}
                    className="flex items-center px-4 py-2 text-red-600 hover:text-red-700"
                  >
                    <XCircle className="h-5 w-5 mr-2" />
                    Cancel
                  </button>
                )}

                <ToggleSwitch
                  checked={checkInsurance}
                  onChange={setCheckInsurance}
                  label="Check Insurance Information"
                  icon={<Shield className="h-5 w-5" />}
                />
              </div>

              {checkInsurance && (
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 px-4 py-2 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-blue-500" />
                  <span>Will analyze pages for insurance-related content</span>
                </div>
              )}
            </div>
          </div>

          {isAnalyzing && <ProgressBar progress={progress} />}
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {results.length > 0 && (
        <>
          <Statistics results={results} />
          <ResultsTable
            results={results}
            filters={filters}
            onFilterChange={setFilters}
          />
        </>
      )}
    </div>
  );
}