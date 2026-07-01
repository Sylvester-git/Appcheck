import type { AnalysisResult, ArchBreakdown, LibraryResult, ZipAlignmentEntry } from '@/types/analysis';
import { PAGE_ALIGN, extractEntryData, getLocalDataOffset, parseZipEntries } from './zip';
import { alignmentToKB, formatAlignment, getLoadAlignment, isAligned } from './elf';

function extractArch(path: string): string {
  if (path.includes('arm64-v8a/')) return 'arm64-v8a';
  if (path.includes('x86_64/')) return 'x86_64';
  if (path.includes('armeabi-v7a/')) return 'armeabi-v7a';
  if (path.includes('x86/')) return 'x86';
  return '—';
}

export function analyzeApk(buf: Buffer, fileName: string): AnalysisResult {
  const soEntries = parseZipEntries(buf).filter((e) => e.name.startsWith('lib/') && e.name.endsWith('.so'));

  const zipEntries: ZipAlignmentEntry[] = [];
  const libraries: LibraryResult[] = [];

  for (const entry of soEntries) {
    const dataOffset = getLocalDataOffset(buf, entry.headerOffset);
    const zipAligned = dataOffset % PAGE_ALIGN === 0;
    zipEntries.push({
      path: entry.name,
      offset: `0x${dataOffset.toString(16).padStart(8, '0')}`,
      aligned: zipAligned,
    });

    let pAlign: number | null = null;
    try {
      pAlign = getLoadAlignment(extractEntryData(buf, entry));
    } catch {
      pAlign = null;
    }

    libraries.push({
      path: entry.name,
      name: entry.name.split('/').pop() ?? entry.name,
      arch: extractArch(entry.name),
      status: isAligned(pAlign) ? 'ALIGNED' : 'UNALIGNED',
      alignment: formatAlignment(pAlign),
      alignmentKB: alignmentToKB(pAlign),
      zipAligned,
    });
  }

  const aligned = libraries.filter((l) => l.status === 'ALIGNED').length;
  const unaligned = libraries.filter((l) => l.status === 'UNALIGNED').length;
  const passRate = libraries.length > 0 ? Math.round((aligned / libraries.length) * 100) : 0;

  const archBreakdown: Record<string, ArchBreakdown> = {};
  for (const lib of libraries) {
    if (!archBreakdown[lib.arch]) archBreakdown[lib.arch] = { total: 0, aligned: 0, unaligned: 0 };
    archBreakdown[lib.arch].total++;
    if (lib.status === 'ALIGNED') archBreakdown[lib.arch].aligned++;
    else archBreakdown[lib.arch].unaligned++;
  }

  const zipOutput = zipEntries.length
    ? zipEntries.map((e) => `  ${e.path} (offset ${e.offset}) ${e.aligned ? 'OK' : 'FAILED'}`).join('\n')
    : '  No native libraries found in lib/*';

  return {
    fileName,
    timestamp: new Date().toISOString(),
    zipAlignment: {
      available: true,
      output: zipOutput,
      entries: zipEntries,
    },
    libraries,
    summary: {
      total: libraries.length,
      aligned,
      unaligned,
      passed: libraries.length > 0 && unaligned === 0,
      passRate,
      archBreakdown,
    },
  };
}
