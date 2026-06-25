'use client';

import { useState, useCallback } from 'react';
import { DropZone } from '@/components/upload/DropZone';
import { ResultsDashboard } from '@/components/results/ResultsDashboard';
import type { AnalysisResult } from '@/types/analysis';

type AppState =
  | { phase: 'idle' }
  | { phase: 'analyzing'; fileName: string }
  | { phase: 'results'; result: AnalysisResult }
  | { phase: 'error'; message: string };

export default function Home() {
  const [state, setState] = useState<AppState>({ phase: 'idle' });

  const handleFile = useCallback(async (file: File) => {
    setState({ phase: 'analyzing', fileName: file.name });

    try {
      const body = new FormData();
      body.append('file', file);

      const res = await fetch('/api/analyze', { method: 'POST', body });
      const data = await res.json();

      if (!res.ok || data.error) {
        setState({ phase: 'error', message: data.error ?? 'Analysis failed' });
        return;
      }

      setState({ phase: 'results', result: data });
    } catch {
      setState({ phase: 'error', message: 'Network error. Please try again.' });
    }
  }, []);

  const reset = useCallback(() => setState({ phase: 'idle' }), []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-16">

        {/* Header */}
        <header className="mb-12 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">APK Checker</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
            16KB Alignment
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Verify ELF alignment of shared libraries in Android APK files
          </p>
        </header>

        {/* States */}
        {state.phase === 'idle' && (
          <div className="animate-fade-in-up" style={{ animationDelay: '60ms' }}>
            <DropZone onFile={handleFile} />
            <p className="text-xs text-gray-400 text-center mt-4">
              Requires <span className="font-mono">objdump</span> and <span className="font-mono">unzip</span> on the host
            </p>
          </div>
        )}

        {state.phase === 'analyzing' && (
          <div className="flex flex-col items-center gap-5 py-24 animate-fade-in-up">
            <div className="flex gap-2">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 bg-gray-300 rounded-full animate-dot-bounce"
                  style={{ animationDelay: `${i * 180}ms` }}
                />
              ))}
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-gray-700">{state.fileName}</p>
              <p className="text-xs text-gray-400">Running ELF alignment check…</p>
            </div>
          </div>
        )}

        {state.phase === 'results' && (
          <ResultsDashboard result={state.result} onReset={reset} />
        )}

        {state.phase === 'error' && (
          <div className="animate-fade-in-up">
            <div className="bg-white border border-gray-100 rounded-2xl px-8 py-10 text-center">
              <div className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center mx-auto mb-4 text-gray-400">
                <span className="text-lg leading-none">✗</span>
              </div>
              <p className="font-medium text-gray-900 mb-1">Analysis failed</p>
              <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">{state.message}</p>
              <button
                onClick={reset}
                className="text-sm font-medium text-gray-900 border border-gray-200 rounded-lg px-5 py-2 hover:bg-gray-50 transition-colors duration-150"
              >
                Try again
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
