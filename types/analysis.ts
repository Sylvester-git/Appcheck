export type LibraryStatus = 'ALIGNED' | 'UNALIGNED';

export interface LibraryResult {
  path: string;
  name: string;
  arch: string;
  status: LibraryStatus;
  alignment: string;
}

export interface ZipAlignmentResult {
  available: boolean;
  output: string;
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
  };
}
