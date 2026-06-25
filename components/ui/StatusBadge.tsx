import type { LibraryStatus } from '@/types/analysis';

interface StatusBadgeProps {
  status: LibraryStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const aligned = status === 'ALIGNED';
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium tracking-wide transition-colors ${
        aligned
          ? 'bg-gray-900 text-white'
          : 'bg-white text-gray-600 border border-gray-300'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
          aligned ? 'bg-white' : 'bg-gray-400'
        }`}
      />
      {status}
    </span>
  );
}
