import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    const filePath = path.join(uploadDir, `${Date.now()}-${file.name}`);
    fs.writeFileSync(filePath, buffer);
    console.log('File saved locally:', filePath);

    const fileUrl = `/uploads/${path.basename(filePath)}`; // Relative URL

    return NextResponse.json({ fileUrl, fileName: file.name });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload fehlgeschlagen' }, { status: 500 });
  }
}