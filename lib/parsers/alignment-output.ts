import type { AnalysisResult, LibraryResult, LibraryStatus } from '@/types/analysis';

const ANSI_RE = /\x1b\[[0-9;]*m/g;

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
      // Format: /path/to/lib.so: ALIGNED (2**14)
      const match = trimmed.match(/^(.+?):\s+(ALIGNED|UNALIGNED)\s+\((.+?)\)/);
      if (match) {
        const [, fullPath, status, alignment] = match;
        libraries.push({
          path: toRelativePath(fullPath),
          name: fullPath.split('/').pop() ?? fullPath,
          arch: extractArch(fullPath),
          status: status as LibraryStatus,
          alignment,
        });
      }
    }
  }

  const aligned = libraries.filter(l => l.status === 'ALIGNED').length;
  const unaligned = libraries.filter(l => l.status === 'UNALIGNED').length;

  return {
    fileName,
    timestamp: new Date().toISOString(),
    zipAlignment: {
      available: !output.includes('NOTICE: Zip alignment check requires'),
      output: zipAlignmentOutput.trim(),
    },
    libraries,
    summary: {
      total: libraries.length,
      aligned,
      unaligned,
      passed: libraries.length > 0 && unaligned === 0,
    },
  };
}
