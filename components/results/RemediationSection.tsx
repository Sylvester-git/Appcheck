'use client';

import type { AnalysisResult, LibraryResult } from '@/types/analysis';

const ARCH_ORDER = ['arm64-v8a', 'x86_64', 'armeabi-v7a', 'x86'];

const FLUTTER_CORE_LIBS = new Set([
  'libflutter.so',
  'libapp.so',
  'libdartjni.so',
  'libdart.so',
]);

interface UnalignedGroup {
  name: string;
  archs: string[];
  alignmentKB: string;
  alignment: string;
  isFlutterCore: boolean;
}

function groupUnaligned(libraries: LibraryResult[]): UnalignedGroup[] {
  const map = new Map<string, UnalignedGroup>();
  for (const lib of libraries) {
    if (lib.status !== 'UNALIGNED') continue;
    if (!map.has(lib.name)) {
      map.set(lib.name, {
        name: lib.name,
        archs: [],
        alignmentKB: lib.alignmentKB,
        alignment: lib.alignment,
        isFlutterCore: FLUTTER_CORE_LIBS.has(lib.name),
      });
    }
    map.get(lib.name)!.archs.push(lib.arch);
  }
  return Array.from(map.values())
    .map(g => ({
      ...g,
      archs: g.archs.sort((a, b) => {
        const ai = ARCH_ORDER.indexOf(a), bi = ARCH_ORDER.indexOf(b);
        return ai === -1 && bi === -1 ? a.localeCompare(b) : ai === -1 ? 1 : bi === -1 ? -1 : ai - bi;
      }),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

interface Step {
  title: string;
  body: string;
  code?: string;
}

function buildSteps(groups: UnalignedGroup[], isFlutter: boolean): Step[] {
  const hasFlutterCore = groups.some(g => g.isFlutterCore);
  const hasThirdParty = groups.some(g => !g.isFlutterCore);

  const steps: Step[] = [];

  if (hasFlutterCore) {
    steps.push({
      title: 'Upgrade Flutter SDK',
      body: 'Flutter added 16 KB page-size support in v3.22. Upgrade to get aligned core libraries.',
      code: 'flutter upgrade\nflutter build apk --release',
    });
  }

  if (hasThirdParty && isFlutter) {
    steps.push({
      title: 'Identify the plugin that ships each library',
      body: 'Check your pubspec.yaml dependencies. Each unaligned .so file is bundled by a Flutter plugin or native SDK. Run the command below to find which package includes it.',
      code: 'flutter pub deps --style=compact | grep -i <lib-name>',
    });
    steps.push({
      title: 'Update the plugin to a 16 KB-aligned version',
      body: 'Run the outdated check, then bump the dependency in pubspec.yaml to the latest version and rebuild.',
      code: 'flutter pub outdated\n# Update the relevant package in pubspec.yaml, then:\nflutter pub get && flutter build apk --release',
    });
  }

  if (hasThirdParty && !isFlutter) {
    steps.push({
      title: 'Add the linker alignment flag (for libraries you build)',
      body: 'If you compile the library yourself, pass the max-page-size flag to the linker.',
      code: '# CMakeLists.txt\ntarget_link_options(<target> PRIVATE -Wl,-z,max-page-size=16384)\n\n# Or in build.gradle (externalNativeBuild)\ncMake {\n  cppFlags "-Wl,-z,max-page-size=16384"\n}',
    });
  }

  if (hasThirdParty) {
    steps.push({
      title: 'If no updated version is available — contact the vendor',
      body: 'File an issue with the library maintainer requesting a 16 KB page-aligned build. As a temporary workaround you can patch the ELF alignment field directly, but this requires testing.',
      code: '# Temporary workaround using patchelf (test thoroughly before shipping)\npatchelf --set-pagesize 16384 lib/arm64-v8a/<libname>.so',
    });
  }

  steps.push({
    title: 'Verify the fix',
    body: 'After rebuilding, upload the new APK here to confirm all libraries pass.',
  });

  return steps;
}

interface Props {
  result: AnalysisResult;
}

export function RemediationSection({ result }: Props) {
  if (result.summary.unaligned === 0) return null;

  const isFlutter = result.libraries.some(l => l.name === 'libflutter.so');
  const groups = groupUnaligned(result.libraries);
  const steps = buildSteps(groups, isFlutter);

  return (
    <div
      className="bg-white border border-red-100 rounded-xl overflow-hidden animate-fade-in-up"
      style={{ animationDelay: '380ms' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-red-50 bg-red-50/50">
        <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center shrink-0">
          <span className="text-white text-xs font-bold leading-none">!</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-red-900">
            How to Fix — {result.summary.unaligned} unaligned{' '}
            {result.summary.unaligned === 1 ? 'library' : 'libraries'}
          </p>
          <p className="text-xs text-red-600 mt-0.5">
            These libraries must be 16 KB aligned for Android 15+ devices
          </p>
        </div>
      </div>

      <div className="px-6 py-5 space-y-6">
        {/* Affected library list */}
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
            Affected Libraries
          </p>
          <div className="space-y-2">
            {groups.map(group => (
              <div
                key={group.name}
                className="flex items-start justify-between gap-4 rounded-lg border border-red-100 bg-red-50/30 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 font-mono">{group.name}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {group.archs.map(arch => (
                      <span
                        key={arch}
                        className="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded"
                      >
                        {arch}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-mono font-medium text-red-600">{group.alignmentKB}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    needs <span className="font-medium text-gray-600">16 KB</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fix steps */}
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
            Fix Steps
          </p>
          <ol className="space-y-4">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-4">
                <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">{step.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{step.body}</p>
                  {step.code && (
                    <pre className="mt-2 bg-gray-950 text-green-400 text-xs font-mono px-4 py-3 rounded-lg overflow-x-auto leading-relaxed whitespace-pre">
                      {step.code}
                    </pre>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
