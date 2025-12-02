import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import InfoItem from '@/models/InfoItem';

const ADMIN_CODE = '872020';

// GET - Einzelnes InfoItem abrufen
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    
    const item = await InfoItem.findById(id);
    if (!item) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }
    
    return NextResponse.json(item);
  } catch (error) {
    console.error('Error fetching info item:', error);
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 });
  }
}

// PUT - InfoItem aktualisieren (Titel, Dateien, Order)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { code, title, files, order } = body;
    
    // Zugangscode prüfen
    if (code !== ADMIN_CODE) {
      return NextResponse.json({ error: 'Ungültiger Zugangscode' }, { status: 403 });
    }
    
    await dbConnect();
    
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (files !== undefined) updateData.files = files;
    if (order !== undefined) updateData.order = order;
    
    const item = await InfoItem.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );
    
    if (!item) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }
    
    return NextResponse.json(item);
  } catch (error) {
    console.error('Error updating info item:', error);
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 });
  }
}

// DELETE - InfoItem löschen
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    
    // Zugangscode prüfen
    if (code !== ADMIN_CODE) {
      return NextResponse.json({ error: 'Ungültiger Zugangscode' }, { status: 403 });
    }
    
    await dbConnect();
    
    const item = await InfoItem.findById(id);
    if (!item) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }
    
    // Dateien von Hetzner löschen
    const username = process.env.WEBDAV_USERNAME!;
    const password = process.env.WEBDAV_PASSWORD!;
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    
    for (const file of item.files) {
      try {
        await fetch(file.fileUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': `Basic ${auth}`
          }
        });
      } catch (err) {
        console.error('Error deleting file from storage:', err);
        // Weitermachen auch wenn Datei nicht gelöscht werden kann
      }
    }
    
    await InfoItem.findByIdAndDelete(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting info item:', error);
    return NextResponse.json({ error: 'Fehler beim Löschen' }, { status: 500 });
  }
}
