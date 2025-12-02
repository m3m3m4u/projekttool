import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import InfoItem from '@/models/InfoItem';

const ADMIN_CODE = '872020';

// POST - Reihenfolge der Items ändern
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, category, orderedIds } = body;
    
    // Zugangscode prüfen
    if (code !== ADMIN_CODE) {
      return NextResponse.json({ error: 'Ungültiger Zugangscode' }, { status: 403 });
    }
    
    if (!category || !orderedIds || !Array.isArray(orderedIds)) {
      return NextResponse.json({ error: 'Ungültige Daten' }, { status: 400 });
    }
    
    await dbConnect();
    
    // Jedes Item mit seiner neuen Order-Nummer aktualisieren
    // Höchste Nummer = oben (neueste zuerst)
    const updates = orderedIds.map((id: string, index: number) => 
      InfoItem.findByIdAndUpdate(id, { order: orderedIds.length - index })
    );
    
    await Promise.all(updates);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering items:', error);
    return NextResponse.json({ error: 'Fehler beim Sortieren' }, { status: 500 });
  }
}
