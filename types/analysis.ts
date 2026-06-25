export type LibraryStatus = 'ALIGNED' | 'UNALIGNED';

export interface ZipAlignmentEntry {
  path: string;
  offset: string;
  aligned: boolean;
}

export interface LibraryResult {
  path: string;
  name: string;
  arch: string;
  status: LibraryStatus;
  alignment: string;
  alignmentKB: string;
  zipAligned?: boolean;
}

export interface ZipAlignmentResult {
  available: boolean;
  output: string;
  entries: ZipAlignmentEntry[];
}

export interface ArchBreakdown {
  total: number;
  aligned: number;
  unaligned: number;
}

export interface AnalysisResult {
  fileName: string;
  timestamp: string;
  zipAlignment: ZipAlignmentResult;
  libraries: LibraryResult[];
  summary: {
    total: number;
    aligned: number;
    unaligned: number;
    passed: boolean;
    passRate: number;
    archBreakdown: Record<string, ArchBreakdown>;
  };
}
