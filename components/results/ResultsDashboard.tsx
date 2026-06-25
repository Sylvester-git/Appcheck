'use client';

import type { AnalysisResult } from '@/types/analysis';
import { SummaryStats } from './SummaryStats';
import { LibraryList } from './LibraryList';

interface ResultsDashboardProps {
  result: AnalysisResult;
  onReset: () => void;
}

export function ResultsDashboard({ result, onReset }: ResultsDashboardProps) {
  const { summary } = result;
  const time = new Date(result.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="space-y-4">
      {/* File header */}
      <div className="bg-white border border-gray-100 rounded-xl px-6 py-5 flex items-center justify-between animate-fade-in-up">
        <div className="min-w-0 mr-4">
          <h2 className="font-semibold text-gray-900 truncate">{result.fileName}</h2>
          <p className="text-xs text-gray-400 mt-0.5">Analyzed at {time}</p>
        </div>
        <div
          className={[
            'flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium',
            summary.passed
              ? 'bg-gray-900 text-white'
              : 'bg-white text-gray-900 border border-gray-200',
          ].join(' ')}
        >
          <span>{summary.passed ? '✓' : '✗'}</span>
          <span>{summary.passed ? 'Passed' : 'Failed'}</span>
        </div>
      </div>

      <SummaryStats result={result} />

      <LibraryList result={result} />

      {/* Zip alignment detail */}
      {result.zipAlignment.available && result.zipAlignment.output ? (
        <div
          className="bg-white border border-gray-100 rounded-xl px-6 py-5 animate-fade-in-up"
          style={{ animationDelay: '360ms' }}
        >
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
            Zip Alignment Output
          </p>
          <pre className="text-xs font-mono text-gray-600 whitespace-pre-wrap overflow-auto max-h-40 leading-relaxed">
            {result.zipAlignment.output}
          </pre>
        </div>
      ) : (
        <div
          className="rounded-xl px-5 py-3.5 bg-gray-50 animate-fade-in-up"
          style={{ animationDelay: '360ms' }}
        >
          <p className="text-xs text-gray-400">
            Zip alignment check skipped — requires{' '}
            <span className="font-mono">build-tools 35.0.0-rc3+</span> with{' '}
            <span className="font-mono">zipalign -P</span> support.
          </p>
        </div>
      )}

      {/* Reset */}
      <div className="pt-1 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
        <button
          onClick={onReset}
          className="text-sm text-gray-400 hover:text-gray-900 transition-colors duration-150 flex items-center gap-1.5"
        >
          <span>←</span>
          <span>Analyze another file</span>
        </button>
      </div>
    </div>
  );
}
