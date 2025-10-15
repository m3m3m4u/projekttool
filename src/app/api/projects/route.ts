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
    console.log('POST /api/projects called');
    await dbConnect();
    console.log('Database connected for POST');
    const body = await request.json();
    console.log('Body:', JSON.stringify(body, null, 2));
    const { title, description } = body;
    const projectCount = await Project.countDocuments();
    console.log('Current project count:', projectCount);
    const newProject = new Project({
      title,
      description,
      order: projectCount + 1,
      items: []
    });
    await newProject.save();
    console.log('New project saved:', newProject._id);
    return NextResponse.json(newProject, { status: 201 });
  } catch (error) {
    console.error('POST /api/projects error:', error);
    return NextResponse.json({ error: 'Fehler beim Erstellen' }, { status: 500 });
  }
}