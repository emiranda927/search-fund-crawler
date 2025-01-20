import { useState, useCallback, useRef } from 'react';
import { AnalysisState, AnalysisOptions, AnalysisResult } from '../types';
import { analyzeWebsites } from '../lib/api';
import toast from 'react-hot-toast';

export function useAnalysis() {
  const [state, setState] = useState<AnalysisState>({
    isAnalyzing: false,
    progress: 0,
    error: null,
    canCancel: false
  });
  
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const abortController = useRef<AbortController | null>(null);

  const startAnalysis = useCallback(async (options: AnalysisOptions) => {
    try {
      setState({
        isAnalyzing: true,
        progress: 0,
        error: null,
        canCancel: true
      });

      abortController.current = new AbortController();

      const analysisResults = await analyzeWebsites({
        ...options,
        signal: abortController.current.signal,
        onProgress: (progress) => {
          setState(prev => ({
            ...prev,
            progress
          }));
        }
      });

      setResults(analysisResults.map(result => ({
        ...result,
        timestamp: Date.now()
      })));

      toast.success('Analysis completed successfully');
    } catch (error) {
      if (error.name === 'AbortError') {
        toast.success('Analysis cancelled');
        return;
      }

      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setState(prev => ({
        ...prev,
        error: errorMessage
      }));
      toast.error(errorMessage);
    } finally {
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        canCancel: false,
        progress: 1
      }));
    }
  }, []);

  const cancelAnalysis = useCallback(() => {
    if (abortController.current) {
      abortController.current.abort();
      abortController.current = null;
    }
  }, []);

  return {
    state,
    results,
    startAnalysis,
    cancelAnalysis
  };
}