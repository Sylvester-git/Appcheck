import type { AnalysisResult } from '@/types/analysis';

interface SummaryStatsProps {
  result: AnalysisResult;
}

export function SummaryStats({ result }: SummaryStatsProps) {
  const { summary } = result;

  const stats = [
    { label: 'Total Libraries', value: summary.total },
    { label: 'Aligned', value: summary.aligned },
    { label: 'Unaligned', value: summary.unaligned },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          className="bg-white border border-gray-100 rounded-xl p-6 text-center animate-fade-in-up"
          style={{ animationDelay: `${80 + i * 60}ms` }}
        >
          <p className="text-3xl font-semibold text-gray-900 tabular-nums">{stat.value}</p>
          <p className="text-xs text-gray-500 mt-1.5 uppercase tracking-wider">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
