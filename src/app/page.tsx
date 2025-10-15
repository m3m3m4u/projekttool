'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Home() {
  const [projects, setProjects] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (!res.ok) {
        throw new Error(`Fehler beim Laden: ${res.status}`);
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setProjects(data);
        setError(null);
      } else {
        throw new Error('Ungültige Datenstruktur erhalten');
      }
    } catch (err) {
      console.error('Fetch projects error:', err);
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
      setProjects([]);
    }
  };

  const addProject = async () => {
    if (!newTitle.trim()) {
      setError('Titel ist erforderlich');
      return;
    }
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, description: newDesc })
      });
      if (!res.ok) {
        throw new Error(`Fehler beim Erstellen: ${res.status}`);
      }
      setNewTitle('');
      setNewDesc('');
      setShowForm(false);
      setError(null);
      fetchProjects();
    } catch (err) {
      console.error('Add project error:', err);
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
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
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
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
