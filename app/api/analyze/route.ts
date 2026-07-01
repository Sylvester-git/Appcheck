import { NextRequest, NextResponse } from 'next/server';
import { analyzeApk } from '@/lib/apk/analyze';

export async function POST(request: NextRequest) {
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

    let result;
    try {
      result = analyzeApk(buffer, file.name);
    } catch (err) {
      console.error('[analyze] failed to parse APK', err);
      return NextResponse.json({ error: 'Could not parse the uploaded file as a valid APK.' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[analyze]', error);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}
