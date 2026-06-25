import type { AnalysisResult } from '@/types/analysis';

const ARCH_ORDER = ['arm64-v8a', 'x86_64', 'armeabi-v7a', 'x86'];

export function SummaryStats({ result }: { result: AnalysisResult }) {
  const { summary } = result;

  const stats = [
    {
      label: 'Total',
      value: summary.total,
      valueColor: 'text-gray-900',
      sub: null,
    },
    {
      label: 'Aligned',
      value: summary.aligned,
      valueColor: summary.aligned > 0 && summary.passed ? 'text-green-600' : 'text-gray-900',
      sub: summary.total > 0 ? `${summary.passRate}% pass rate` : null,
    },
    {
      label: 'Unaligned',
      value: summary.unaligned,
      valueColor: summary.unaligned > 0 ? 'text-red-600' : 'text-gray-400',
      sub: summary.unaligned > 0 ? 'action required' : 'none found',
    },
  ];

  const archs = Object.keys(summary.archBreakdown).sort((a, b) => {
    const ai = ARCH_ORDER.indexOf(a);
    const bi = ARCH_ORDER.indexOf(b);
    return ai === -1 && bi === -1 ? a.localeCompare(b) : ai === -1 ? 1 : bi === -1 ? -1 : ai - bi;
  });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className="bg-white border border-gray-100 rounded-xl p-6 text-center animate-fade-in-up"
            style={{ animationDelay: `${80 + i * 60}ms` }}
          >
            <p className={`text-3xl font-semibold tabular-nums ${stat.valueColor}`}>
              {stat.value}
            </p>
            <p className="text-xs text-gray-500 mt-1.5 uppercase tracking-wider">{stat.label}</p>
            {stat.sub && (
              <p className={`text-xs mt-1 ${
                stat.label === 'Unaligned' && summary.unaligned > 0 ? 'text-red-500' : 'text-gray-400'
              }`}>
                {stat.sub}
              </p>
            )}
          </div>
        ))}
      </div>

      {archs.length > 1 && (
        <div
          className="bg-white border border-gray-100 rounded-xl px-6 py-4 animate-fade-in-up"
          style={{ animationDelay: '260ms' }}
        >
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
            By Architecture
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {archs.map(arch => {
              const { total, aligned, unaligned } = summary.archBreakdown[arch];
              const allAligned = unaligned === 0;
              return (
                <div key={arch} className="flex items-center gap-2.5">
                  <span className="text-xs font-mono font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                    {arch}
                  </span>
                  <span className={`text-xs font-medium tabular-nums ${allAligned ? 'text-green-600' : 'text-red-600'}`}>
                    {aligned}/{total}
                  </span>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${allAligned ? 'bg-green-500' : 'bg-red-500'}`} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
