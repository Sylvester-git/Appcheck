import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import os from 'os';
import { parseAlignmentOutput } from '@/lib/parsers/alignment-output';

const execAsync = promisify(exec);

const SCRIPT_PATH = join(process.cwd(), 'scripts', 'check_elf_alignment.sh');

export async function POST(request: NextRequest) {
  let tmpPath = '';

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith('.apk')) {
      return NextResponse.json({ error: 'Only .apk files are supported' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    tmpPath = join(os.tmpdir(), `apk_${Date.now()}_${safeFileName}`);
    await writeFile(tmpPath, buffer);

    let stdout = '';
    let stderr = '';

    try {
      ({ stdout, stderr } = await execAsync(
        `bash "${SCRIPT_PATH}" "${tmpPath}"`,
        { timeout: 120_000, maxBuffer: 20 * 1024 * 1024 },
      ));
    } catch (err: unknown) {
      // Script may exit non-zero when unaligned libs are found; output is still valid
      if (err && typeof err === 'object' && 'stdout' in err) {
        ({ stdout, stderr } = err as { stdout: string; stderr: string });
      } else {
        throw err;
      }
    }

    const rawOutput = stdout + stderr;

    if (!rawOutput.includes('=== ELF alignment ===')) {
      return NextResponse.json(
        { error: 'No ELF alignment output produced. Ensure objdump and unzip are installed.' },
        { status: 500 },
      );
    }

    return NextResponse.json(parseAlignmentOutput(rawOutput, file.name));
  } catch (error) {
    console.error('[analyze]', error);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  } finally {
    if (tmpPath) await unlink(tmpPath).catch(() => {});
  }
}
