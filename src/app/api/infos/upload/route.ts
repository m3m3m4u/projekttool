import { NextRequest, NextResponse } from 'next/server';

const ADMIN_CODE = '872020';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in Bytes

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const code = formData.get('code') as string;
    const category = formData.get('category') as string;
    
    // Zugangscode prüfen
    if (code !== ADMIN_CODE) {
      return NextResponse.json({ error: 'Ungültiger Zugangscode' }, { status: 403 });
    }
    
    if (!file) {
      return NextResponse.json({ error: 'Keine Datei' }, { status: 400 });
    }
    
    // Dateigröße prüfen
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: `Datei zu groß (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum: 5MB` 
      }, { status: 413 });
    }
    
    const buffer = Buffer.from(await file.arrayBuffer());
    const timestamp = Date.now();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${timestamp}-${safeFileName}`;
    const remotePath = `/projekttool-infos/${category}/${fileName}`;
    
    const username = process.env.WEBDAV_USERNAME!;
    const password = process.env.WEBDAV_PASSWORD!;
    const auth = Buffer.from(`${username}:${password}`).toString('base64');

    // Verzeichnisstruktur erstellen
    const baseDir = `${process.env.WEBDAV_URL}/projekttool-infos`;
    const categoryDir = `${baseDir}/${category}`;
    
    // Hauptverzeichnis erstellen
    await fetch(baseDir, {
      method: 'MKCOL',
      headers: { 'Authorization': `Basic ${auth}` }
    });
    
    // Kategorie-Verzeichnis erstellen
    await fetch(categoryDir, {
      method: 'MKCOL',
      headers: { 'Authorization': `Basic ${auth}` }
    });

    // Datei hochladen
    const webdavUrl = `${process.env.WEBDAV_URL}${remotePath}`;
    
    const response = await fetch(webdavUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': file.type || 'application/octet-stream'
      },
      body: buffer
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} ${errorText}`);
    }

    return NextResponse.json({ 
      fileUrl: webdavUrl, 
      fileName: fileName,
      originalName: file.name 
    });
  } catch (error) {
    console.error('Upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Upload fehlgeschlagen', details: errorMessage }, { status: 500 });
  }
}
