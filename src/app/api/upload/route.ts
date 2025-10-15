import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'webdav';

export async function POST(request: NextRequest) {
  try {
    console.log('Upload API called');
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      console.log('No file');
      return NextResponse.json({ error: 'Keine Datei' }, { status: 400 });
    }
    console.log('File:', file.name, file.size);

    const client = createClient(process.env.WEBDAV_URL!, {
      username: process.env.WEBDAV_USERNAME!,
      password: process.env.WEBDAV_PASSWORD!
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    const remotePath = `/uploads/${Date.now()}-${file.name}`;

    await client.putFileContents(remotePath, buffer, { overwrite: true });
    console.log('File uploaded to WEBDAV:', remotePath);

    const fileUrl = `${process.env.WEBDAV_URL}${remotePath}`;

    return NextResponse.json({ fileUrl, fileName: file.name });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload fehlgeschlagen' }, { status: 500 });
  }
}