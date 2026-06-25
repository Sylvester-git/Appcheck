import type { LibraryStatus } from '@/types/analysis';

interface StatusBadgeProps {
  status: LibraryStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const aligned = status === 'ALIGNED';
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium tracking-wide ${
        aligned
          ? 'bg-green-600 text-white'
          : 'bg-red-600 text-white'
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-white/70 shrink-0" />
      {status}
    </span>
  );
}
