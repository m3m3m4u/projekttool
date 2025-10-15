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
    const remotePath = `/${fileName}`;
    
    const webdavUrl = `${process.env.WEBDAV_URL}${remotePath}`;
    
    // Decode password in case it was URL-encoded in Vercel
    const username = process.env.WEBDAV_USERNAME!;
    const password = process.env.WEBDAV_PASSWORD!;
    const auth = Buffer.from(`${username}:${password}`).toString('base64');

    console.log('Uploading to:', webdavUrl);
    console.log('Username:', username);
    console.log('Password length:', password.length);
    console.log('Auth header (first 20 chars):', auth.substring(0, 20));

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