import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('Upload API called');
    console.log('Environment variables check:', {
      hasURL: !!process.env.WEBDAV_URL,
      hasUsername: !!process.env.WEBDAV_USERNAME,
      hasPassword: !!process.env.WEBDAV_PASSWORD,
      url: process.env.WEBDAV_URL
    });

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      console.log('No file');
      return NextResponse.json({ error: 'Keine Datei' }, { status: 400 });
    }
    console.log('File:', file.name, file.size);

    const buffer = Buffer.from(await file.arrayBuffer());
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name}`;
    const remotePath = `/uploads/${fileName}`;
    
    const webdavUrl = `${process.env.WEBDAV_URL}${remotePath}`;
    const auth = Buffer.from(`${process.env.WEBDAV_USERNAME}:${process.env.WEBDAV_PASSWORD}`).toString('base64');

    console.log('Uploading to:', webdavUrl);

    const response = await fetch(webdavUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': file.type || 'application/octet-stream'
      },
      body: buffer
    });

    console.log('WEBDAV response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('WEBDAV error:', errorText);
      throw new Error(`WEBDAV upload failed: ${response.status} ${errorText}`);
    }

    console.log('File uploaded successfully:', remotePath);

    const fileUrl = webdavUrl;

    return NextResponse.json({ fileUrl, fileName: file.name });
  } catch (error) {
    console.error('Upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Upload fehlgeschlagen', details: errorMessage }, { status: 500 });
  }
}