import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Project from '@/models/Project';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const { id } = await params;
    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 });
    }
    return NextResponse.json(project);
  } catch (error) {
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const { id } = await params;
    console.log('PUT API called for project:', id);
    const body = await request.json();
    console.log('Body:', JSON.stringify(body, null, 2));
    const project = await Project.findById(id);
    if (!project) {
      console.log('Project not found');
      return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 });
    }
    
    // Update fields if provided
    if (body.title !== undefined) project.title = body.title;
    if (body.description !== undefined) project.description = body.description;
    if (body.members !== undefined) project.members = body.members;
    if (body.items !== undefined) project.items = body.items;
    
    await project.save({ validateBeforeSave: false });
    console.log('Project saved');
    return NextResponse.json(project);
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    const { codeword } = body;
    if (codeword !== '872020') {
      return NextResponse.json({ error: 'Falsches Codewort' }, { status: 403 });
    }
    const deletedProject = await Project.findByIdAndDelete(id);
    if (!deletedProject) {
      return NextResponse.json({ error: 'Projekt nicht gefunden' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Gelöscht' });
  } catch (error) {
    return NextResponse.json({ error: 'Fehler beim Löschen' }, { status: 500 });
  }
}