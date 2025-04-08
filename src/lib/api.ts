import { AnalysisResult } from '../types.js';

interface AnalyzeOptions {
  urls: string[];
  keywords: string[];
  checkInsurance?: boolean;
  onProgress?: (progress: number) => void;
}

const backendUrl = import.meta.env.VITE_BACKEND_URL;

export async function analyzeWebsites({
  urls,
  keywords,
  checkInsurance = true,
  onProgress
}: AnalyzeOptions): Promise<AnalysisResult[]> {
  try {
    const response = await fetch(`${backendUrl}/api/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ urls, keywords, checkInsurance }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const decoder = new TextDecoder();
    const reader = response.body?.getReader();
    let buffer = '';
    let results: AnalysisResult[] = [];

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            if (line.startsWith('Progress:')) {
              const progressMatch = line.match(/Progress: (\d+(?:\.\d+)?)%/);
              if (progressMatch && onProgress) {
                const progress = parseFloat(progressMatch[1]) / 100;
                onProgress(progress);
              }
            } else {
              try {
                const data = JSON.parse(line);
                if (Array.isArray(data)) {
                  results = data;
                }
              } catch (e) {
                console.debug('Non-JSON line:', line);
              }
            }
          }
        }
      }

      if (buffer.trim()) {
        try {
          const data = JSON.parse(buffer);
          if (Array.isArray(data)) {
            results = data;
          }
        } catch (e) {
          console.debug('Failed to parse remaining buffer:', buffer);
        }
      }
    }

    return results;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}
