import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Project from '@/models/Project';

export async function GET() {
  try {
    console.log('GET /api/projects called');
    await dbConnect();
    console.log('Database connected');
    const projects = await Project.find({});
    console.log('Projects found:', projects.length);
    return NextResponse.json(projects);
  } catch (error) {
    console.error('GET /api/projects error:', error);
    return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    const { title, description } = body;
    const projectCount = await Project.countDocuments();
    const newProject = new Project({
      title,
      description,
      order: projectCount + 1,
      items: []
    });
    await newProject.save();
    return NextResponse.json(newProject, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Fehler beim Erstellen' }, { status: 500 });
  }
}