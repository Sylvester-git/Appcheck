'use client';

import { useState } from 'react';
import type { AnalysisResult, LibraryResult } from '@/types/analysis';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface LibraryListProps {
  result: AnalysisResult;
}

type SortKey = 'name' | 'arch' | 'status';
type FilterKey = 'all' | 'ALIGNED' | 'UNALIGNED';

export function LibraryList({ result }: LibraryListProps) {
  const [sort, setSort] = useState<SortKey>('status');
  const [filter, setFilter] = useState<FilterKey>('all');

  const displayed = [...result.libraries]
    .filter(l => filter === 'all' || l.status === filter)
    .sort((a, b) => {
      if (sort === 'status') {
        if (a.status !== b.status) return a.status === 'UNALIGNED' ? -1 : 1;
      }
      if (sort === 'arch') return a.arch.localeCompare(b.arch);
      return a.name.localeCompare(b.name);
    });

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'ALIGNED', label: `Aligned (${result.summary.aligned})` },
    { key: 'UNALIGNED', label: `Unaligned (${result.summary.unaligned})` },
  ];

  const cols: { label: string; key: SortKey }[] = [
    { label: 'Library', key: 'name' },
    { label: 'Arch', key: 'arch' },
    { label: 'Status', key: 'status' },
  ];

  return (
    <div
      className="bg-white border border-gray-100 rounded-xl overflow-hidden animate-fade-in-up"
      style={{ animationDelay: '260ms' }}
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
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
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-50">
              {cols.map(col => (
                <th
                  key={col.key}
                  className={`py-3 px-6 text-left ${col.key === 'status' ? 'text-right' : ''}`}
                >
                  <button
                    onClick={() => setSort(col.key)}
                    className={[
                      'text-xs uppercase tracking-wider font-medium transition-colors',
                      sort === col.key ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600',
                    ].join(' ')}
                  >
                    {col.label}
                    {sort === col.key && <span className="ml-1 opacity-60">↑</span>}
                  </button>
                </th>
              ))}
              <th className="py-3 px-6">
                <span className="text-xs uppercase tracking-wider font-medium text-gray-400">
                  Alignment
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {displayed.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-400">
                  No libraries match the current filter
                </td>
              </tr>
            ) : (
              displayed.map((lib, i) => (
                <LibraryRow key={`${lib.path}-${i}`} lib={lib} index={i} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LibraryRow({ lib, index }: { lib: LibraryResult; index: number }) {
  return (
    <tr
      className="hover:bg-gray-50/80 transition-colors duration-100 animate-fade-in-up"
      style={{ animationDelay: `${280 + index * 25}ms` }}
    >
      <td className="px-6 py-4">
        <p className="text-sm font-medium text-gray-900">{lib.name}</p>
        <p className="text-xs text-gray-400 font-mono mt-0.5 truncate max-w-xs">{lib.path}</p>
      </td>
      <td className="px-6 py-4">
        <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
          {lib.arch}
        </span>
      </td>
      <td className="px-6 py-4 text-right">
        <StatusBadge status={lib.status} />
      </td>
      <td className="px-6 py-4">
        <span className="text-sm font-mono text-gray-500">{lib.alignment}</span>
      </td>
    </tr>
  );
}
