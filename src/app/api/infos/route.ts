import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import InfoItem from '@/models/InfoItem';

const ADMIN_CODE = '872020';

// GET - Alle InfoItems abrufen
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    
    const query = category ? { category } : {};
    const items = await InfoItem.find(query).sort({ order: -1, createdAt: -1 });
    
    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching info items:', error);
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 });
  }
}

// POST - Neues InfoItem erstellen
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, category, title, files } = body;
    
    // Zugangscode prüfen
    if (code !== ADMIN_CODE) {
      return NextResponse.json({ error: 'Ungültiger Zugangscode' }, { status: 403 });
    }
    
    if (!category || !title) {
      return NextResponse.json({ error: 'Kategorie und Titel erforderlich' }, { status: 400 });
    }
    
    await dbConnect();
    
    // Höchste Order-Nummer in der Kategorie finden
    const highestOrder = await InfoItem.findOne({ category }).sort({ order: -1 });
    const newOrder = highestOrder ? highestOrder.order + 1 : 0;
    
    const newItem = await InfoItem.create({
      category,
      title,
      files: files || [],
      order: newOrder
    });
    
    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error('Error creating info item:', error);
    return NextResponse.json({ error: 'Fehler beim Erstellen' }, { status: 500 });
  }
}
