'use client';

import { Fragment, useState } from 'react';
import type { AnalysisResult, LibraryResult } from '@/types/analysis';
import { StatusBadge } from '@/components/ui/StatusBadge';

type FilterKey = 'all' | 'ALIGNED' | 'UNALIGNED';

const ARCH_ORDER = ['arm64-v8a', 'x86_64', 'armeabi-v7a', 'x86'];

export function LibraryList({ result }: { result: AnalysisResult }) {
  const [filter, setFilter] = useState<FilterKey>('all');

  const showZip = result.zipAlignment.available && result.zipAlignment.entries.length > 0;

  const filtered = result.libraries.filter(l => filter === 'all' || l.status === filter);

  const grouped = filtered.reduce<Record<string, LibraryResult[]>>((acc, lib) => {
    (acc[lib.arch] ??= []).push(lib);
    return acc;
  }, {});

  const archs = Object.keys(grouped).sort((a, b) => {
    const ai = ARCH_ORDER.indexOf(a);
    const bi = ARCH_ORDER.indexOf(b);
    return ai === -1 && bi === -1 ? a.localeCompare(b) : ai === -1 ? 1 : bi === -1 ? -1 : ai - bi;
  });

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'ALIGNED', label: `Aligned (${result.summary.aligned})` },
    { key: 'UNALIGNED', label: `Unaligned (${result.summary.unaligned})` },
  ];

  return (
    <div
      className="bg-white border border-gray-100 rounded-xl overflow-hidden animate-fade-in-up"
      style={{ animationDelay: '300ms' }}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <span className="text-sm font-medium text-gray-900">Libraries</span>
        <div className="flex gap-1 bg-gray-50 rounded-lg p-1">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={[
                'px-3 py-1 rounded-md text-xs font-medium transition-all duration-150',
                filter === f.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700',
              ].join(' ')}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        {archs.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-gray-400">
            No libraries match the current filter
          </p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Library
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  ELF Align
                </th>
                {showZip && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    ZIP
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {archs.map(arch => {
                const libs = grouped[arch];
                const alignedCount = libs.filter(l => l.status === 'ALIGNED').length;
                const allAligned = alignedCount === libs.length;
                return (
                  <Fragment key={arch}>
                    {/* Architecture group header */}
                    <tr className="bg-gray-50 border-y border-gray-100">
                      <td colSpan={showZip ? 4 : 3} className="px-6 py-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold font-mono text-gray-600">{arch}</span>
                          <span className={`text-xs font-medium tabular-nums ${allAligned ? 'text-green-600' : 'text-red-600'}`}>
                            {alignedCount}/{libs.length} aligned
                          </span>
                        </div>
                      </td>
                    </tr>
                    {libs.map((lib, i) => (
                      <LibraryRow key={lib.path} lib={lib} index={i} showZip={showZip} />
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function LibraryRow({
  lib,
  index,
  showZip,
}: {
  lib: LibraryResult;
  index: number;
  showZip: boolean;
}) {
  return (
    <tr
      className="hover:bg-gray-50/80 transition-colors duration-100 animate-fade-in-up border-b border-gray-50 last:border-0"
      style={{ animationDelay: `${320 + index * 20}ms` }}
    >
      <td className="px-6 py-3.5">
        <p className="text-sm font-medium text-gray-900">{lib.name}</p>
        <p className="text-xs text-gray-400 font-mono mt-0.5 truncate max-w-xs">{lib.path}</p>
      </td>
      <td className="px-4 py-3.5">
        <StatusBadge status={lib.status} />
      </td>
      <td className="px-4 py-3.5">
        <span className={`text-sm font-mono font-medium ${
          lib.status === 'ALIGNED' ? 'text-green-600' : 'text-red-600'
        }`}>
          {lib.alignmentKB}
        </span>
        <span className="text-xs text-gray-400 ml-1.5 font-mono">({lib.alignment})</span>
      </td>
      {showZip && (
        <td className="px-4 py-3.5">
          {lib.zipAligned !== undefined ? (
            <span className={`text-xs font-medium ${lib.zipAligned ? 'text-green-600' : 'text-red-600'}`}>
              {lib.zipAligned ? '✓ OK' : '✗ FAIL'}
            </span>
          ) : (
            <span className="text-xs text-gray-300">—</span>
          )}
        </td>
      )}
    </tr>
  );
}
