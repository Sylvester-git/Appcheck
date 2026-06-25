import type {
  AnalysisResult,
  ArchBreakdown,
  LibraryResult,
  LibraryStatus,
  ZipAlignmentEntry,
} from '@/types/analysis';

const ANSI_RE = /(?:\x1b|\\e)\[[0-9;]*m/g;

function stripAnsi(str: string): string {
  return str.replace(ANSI_RE, '');
}

function extractArch(path: string): string {
  if (path.includes('/arm64-v8a/')) return 'arm64-v8a';
  if (path.includes('/x86_64/')) return 'x86_64';
  if (path.includes('/armeabi-v7a/')) return 'armeabi-v7a';
  if (path.includes('/x86/')) return 'x86';
  return '—';
}

function toRelativePath(fullPath: string): string {
  const libIdx = fullPath.indexOf('/lib/');
  if (libIdx !== -1) return fullPath.slice(libIdx + 1);
  return fullPath.split('/').pop() ?? fullPath;
}

function alignmentToKB(alignment: string): string {
  const match = alignment.match(/2\*\*(\d+)/);
  if (!match) return alignment;
  const bytes = Math.pow(2, parseInt(match[1], 10));
  if (bytes >= 1024) return `${bytes / 1024} KB`;
  return `${bytes} B`;
}

function parseZipEntries(zipOutput: string): ZipAlignmentEntry[] {
  return zipOutput.split('\n').reduce<ZipAlignmentEntry[]>((acc, line) => {
    const m = line.trim().match(/^(lib\/.+?\.so)\s+\(offset\s+(0x[0-9a-fA-F]+)\)\s+(OK|FAILED)$/);
    if (m) acc.push({ path: m[1], offset: m[2], aligned: m[3] === 'OK' });
    return acc;
  }, []);
}

export function parseAlignmentOutput(rawOutput: string, fileName: string): AnalysisResult {
  const output = stripAnsi(rawOutput);
  const lines = output.split('\n');

  const libraries: LibraryResult[] = [];
  let zipAlignmentOutput = '';
  let inElfSection = false;
  let inZipSection = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === '=== APK zip-alignment ===') { inZipSection = true; inElfSection = false; continue; }
    if (trimmed === '=========================') { inZipSection = false; continue; }
    if (trimmed === '=== ELF alignment ===') { inElfSection = true; inZipSection = false; continue; }
    if (trimmed === '=====================') { inElfSection = false; continue; }

    if (inZipSection) {
      zipAlignmentOutput += line + '\n';
    }

    if (inElfSection) {
      const match = trimmed.match(/^(.+?):\s+(ALIGNED|UNALIGNED)\s+\((.+?)\)/);
      if (match) {
        const [, fullPath, status, alignment] = match;
        libraries.push({
          path: toRelativePath(fullPath),
          name: fullPath.split('/').pop() ?? fullPath,
          arch: extractArch(fullPath),
          status: status as LibraryStatus,
          alignment,
          alignmentKB: alignmentToKB(alignment),
        });
      }
    }
  }

  // Cross-reference zip alignment entries with each library
  const zipEntries = parseZipEntries(zipAlignmentOutput);
  const zipMap = new Map(zipEntries.map(e => [e.path, e.aligned]));
  for (const lib of libraries) {
    const zipAligned = zipMap.get(lib.path);
    if (zipAligned !== undefined) lib.zipAligned = zipAligned;
  }

  const aligned = libraries.filter(l => l.status === 'ALIGNED').length;
  const unaligned = libraries.filter(l => l.status === 'UNALIGNED').length;
  const passRate = libraries.length > 0 ? Math.round((aligned / libraries.length) * 100) : 0;

  const archBreakdown: Record<string, ArchBreakdown> = {};
  for (const lib of libraries) {
    if (!archBreakdown[lib.arch]) archBreakdown[lib.arch] = { total: 0, aligned: 0, unaligned: 0 };
    archBreakdown[lib.arch].total++;
    if (lib.status === 'ALIGNED') archBreakdown[lib.arch].aligned++;
    else archBreakdown[lib.arch].unaligned++;
  }

  return {
    fileName,
    timestamp: new Date().toISOString(),
    zipAlignment: {
      available: !output.includes('NOTICE: Zip alignment check requires'),
      output: zipAlignmentOutput.trim(),
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
