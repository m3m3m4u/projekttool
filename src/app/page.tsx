'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Home() {
  const [projects, setProjects] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const res = await fetch('/api/projects');
    const data = await res.json();
    setProjects(data);
  };

  const addProject = async () => {
    if (!newTitle.trim()) return;
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle, description: newDesc })
    });
    if (res.ok) {
      setNewTitle('');
      setNewDesc('');
      setShowForm(false);
      fetchProjects();
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Schul- und Unterrichtsentwicklung: Arbeitsgruppen</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Neue Gruppe erstellen
        </button>
      </div>
      {showForm && (
        <div className="mb-8 p-4 border rounded">
          <h2 className="text-xl mb-4">Neue Gruppe hinzufügen</h2>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Titel"
            className="w-full p-2 border rounded mb-2"
          />
          <textarea
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Beschreibung"
            className="w-full p-2 border rounded mb-2"
          />
          <button onClick={addProject} className="px-4 py-2 bg-green-500 text-white rounded">Hinzufügen</button>
        </div>
      )}
      <div className="grid gap-4">
        {projects.map((project) => (
          <Link key={project._id} href={`/project/${project._id}`} className="block p-4 border rounded hover:bg-gray-100">
            <h2 className="text-xl font-semibold">{project.title}</h2>
          </Link>
        ))}
      </div>
    </div>
  );
}
