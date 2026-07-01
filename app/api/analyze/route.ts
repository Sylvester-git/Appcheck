import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { analyzeApk } from '@/lib/apk/analyze';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let blobUrl = '';

  try {
    const { url, fileName } = (await request.json()) as { url?: string; fileName?: string };

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'No file URL provided' }, { status: 400 });
    }
    if (!fileName || !fileName.toLowerCase().endsWith('.apk')) {
      return NextResponse.json({ error: 'Only .apk files are supported' }, { status: 400 });
    }
    blobUrl = url;

    const fileResponse = await fetch(url);
    if (!fileResponse.ok) {
      return NextResponse.json({ error: 'Failed to download uploaded file' }, { status: 502 });
    }
    const buffer = Buffer.from(await fileResponse.arrayBuffer());

    let result;
    try {
      result = analyzeApk(buffer, fileName);
    } catch (err) {
      console.error('[analyze] failed to parse APK', err);
      return NextResponse.json({ error: 'Could not parse the uploaded file as a valid APK.' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[analyze]', error);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  } finally {
    if (blobUrl) await del(blobUrl).catch(() => {});
  }
}
