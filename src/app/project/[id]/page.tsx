"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { useRouter } from 'next/navigation';
import { use } from 'react';

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const [project, setProject] = useState<any>(null);
  const [editTitle, setEditTitle] = useState(false);
  const [editDesc, setEditDesc] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [newText, setNewText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [itemContent, setItemContent] = useState('');
  const [deleteCode, setDeleteCode] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<{fileName: string, fileUrl: string}[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [removedFiles, setRemovedFiles] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { id } = use(params);

  useEffect(() => {
    fetchProject();
  }, [id]);

  useEffect(() => {
    if (editingItem && editRef.current) {
      editRef.current.innerHTML = itemContent;
    }
  }, [editingItem]);

  useEffect(() => {
    setHasUnsavedChanges(newText.trim() !== '' || editingItem !== null);
  }, [newText, editingItem]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const fetchProject = async () => {
    const res = await fetch(`/api/project/${id}`);
    const data = await res.json();
    setProject(data);
    setTitle(data.title);
    setDescription(data.description);
  };

  const saveTitle = async () => {
    const res = await fetch(`/api/project/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title })
    });
    if (res.ok) {
      setProject({ ...project, title });
      setEditTitle(false);
    }
  };

  const saveDesc = async () => {
    const res = await fetch(`/api/project/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description })
    });
    if (res.ok) {
      setProject({ ...project, description });
      setEditDesc(false);
    }
  };

  const addTextItem = async () => {
    if (!newText.trim() && attachedFiles.length === 0) return;
    const newItem = {
      id: Date.now().toString(),
      type: 'text',
      content: {
        text: newText,
        files: attachedFiles
      },
      date: new Date().toISOString(),
      order: 1
    };
    const updatedItems = [newItem, ...project.items.map((item: any) => ({ ...item, order: item.order + 1 }))];
    const res = await fetch(`/api/project/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: updatedItems })
    });
    console.log('Sending body in addTextItem:', JSON.stringify({ items: updatedItems }, null, 2));
    if (res.ok) {
      setProject({ ...project, items: updatedItems });
      setNewText('');
      setAttachedFiles([]);
    }
  };

  const addFileItem = async () => {
    if (!selectedFile) return;
    console.log('Upload startet...');
    const formData = new FormData();
    formData.append('file', selectedFile);
    const uploadRes = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    if (!uploadRes.ok) {
      console.error('Upload fehlgeschlagen');
      return;
    }
    const { fileUrl, fileName } = await uploadRes.json();
    console.log('Upload erfolgreich:', fileUrl);
    setAttachedFiles(prev => [...prev, { fileName, fileUrl }]);
    alert('Datei angehängt: ' + fileName);
  };

  const startEditItem = (item: any) => {
    setEditingItem(item.id);
    setItemContent(typeof item.content === 'string' ? item.content : (item.content?.text || ''));
    setRemovedFiles(new Set());
  };

  const saveEditedItem = async () => {
    const updatedItems = project.items.map((item: any) =>
      item.id === editingItem ? { ...item, content: { text: itemContent, files: [...(item.content?.files || []).filter((file: any) => !removedFiles.has(file.fileUrl)), ...attachedFiles] } } : item
    );
    const res = await fetch(`/api/project/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: updatedItems })
    });
    if (res.ok) {
      setProject({ ...project, items: updatedItems });
      setEditingItem(null);
      setItemContent('');
      setAttachedFiles([]);
    }
  };

  const moveUp = async (itemId: string) => {
    const currentIndex = project.items.findIndex((item: any) => item.id === itemId);
    if (currentIndex > 0) {
      const newItems = [...project.items];
      [newItems[currentIndex - 1], newItems[currentIndex]] = [newItems[currentIndex], newItems[currentIndex - 1]];
      newItems.forEach((item, index) => item.order = index + 1);
      const res = await fetch(`/api/project/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: newItems })
      });
      if (res.ok) {
        setProject({ ...project, items: newItems });
      }
    }
  };

  const moveDown = async (itemId: string) => {
    const currentIndex = project.items.findIndex((item: any) => item.id === itemId);
    if (currentIndex < project.items.length - 1) {
      const newItems = [...project.items];
      [newItems[currentIndex], newItems[currentIndex + 1]] = [newItems[currentIndex + 1], newItems[currentIndex]];
      newItems.forEach((item, index) => item.order = index + 1);
      const res = await fetch(`/api/project/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: newItems })
      });
      if (res.ok) {
        setProject({ ...project, items: newItems });
      }
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!confirm('Wirklich diesen Text löschen?')) return;
    const updatedItems = project.items.filter((item: any) => item.id !== itemId);
    const res = await fetch(`/api/project/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: updatedItems })
    });
    if (res.ok) {
      setProject({ ...project, items: updatedItems });
    }
  };

  const deleteProject = async () => {
    const res = await fetch(`/api/project/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codeword: deleteCode })
    });
    if (res.ok) {
      router.push('/');
    } else {
      alert('Falsches Codewort');
    }
  };

  if (!project) return <div>Lade...</div>;

  return (
    <div className="min-h-screen p-8">
      <div className="flex justify-between items-center mb-4">
        <Link href="/" className="text-blue-500">Zurück</Link>
        <button onClick={() => setEditMode(!editMode)} className="px-4 py-2 bg-blue-500 text-white rounded">
          {editMode ? 'Bearbeitungsmodus ausschalten' : 'Bearbeitungsmodus einschalten'}
        </button>
      </div>
      <div className="mb-4">
        {editTitle ? (
          <div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2 border" />
            <button onClick={saveTitle} className="mt-2 px-4 py-2 bg-green-500 text-white rounded">Speichern</button>
          </div>
        ) : (
          <h1 className="text-2xl font-bold inline">{project.title}</h1>
        )}
        {editMode && <button onClick={() => setEditTitle(!editTitle)} className="ml-2 px-1 py-1 bg-gray-200 rounded text-sm">{editMode ? 'Bearbeiten' : '✏️'}</button>}
      </div>
      <div className="mb-8">
        {editDesc ? (
          <div>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-2 border" />
            <button onClick={saveDesc} className="mt-2 px-4 py-2 bg-green-500 text-white rounded">Speichern</button>
          </div>
        ) : (
          <p>{project.description}</p>
        )}
        {editMode && <button onClick={() => setEditDesc(!editDesc)} className="mt-2 px-1 py-1 bg-gray-200 rounded text-sm">{editMode ? 'Bearbeiten' : '✏️'}</button>}
      </div>
      {editMode && <div className="mb-8 p-4 border-2 border-gray-300 rounded bg-gray-50">
        <h3 className="text-lg font-semibold mb-4">Neuen Inhalt hinzufügen</h3>
        <div
          contentEditable
          ref={editorRef}
          onInput={(e) => setNewText(e.currentTarget.innerHTML)}
          className="w-full p-2 border rounded mb-2 min-h-[100px]"
        />
        <div className="flex gap-2 mb-2">
          <button onClick={() => { editorRef.current?.focus(); document.execCommand('bold'); }} className="px-3 py-1 bg-gray-200 rounded" title="Fett"><strong>B</strong></button>
          <button onClick={() => { editorRef.current?.focus(); document.execCommand('underline'); }} className="px-3 py-1 bg-gray-200 rounded" title="Unterstrichen"><u>U</u></button>
          <label className="px-3 py-1 bg-gray-200 rounded cursor-pointer" title="Datei anhängen">
            📎
            <input
              type="file"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  console.log('Datei ausgewählt:', file.name);
                  setSelectedFile(file);
                  await addFileItem();
                  e.target.value = '';
                }
              }}
              className="hidden"
            />
          </label>
        </div>
        {attachedFiles.length > 0 && (
          <div className="mt-2 p-3 border-2 border-blue-400 rounded bg-blue-50">
            <p className="text-sm font-semibold text-blue-800 mb-2">Angehängt an diesen Text:</p>
            <div className="space-y-1">
              {attachedFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-2 bg-white p-2 rounded border">
                  <button onClick={() => window.open(file.fileUrl, '_blank')} className="text-blue-600 underline font-medium">{file.fileName}</button>
                  <button onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== index))} className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600">X</button>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="mt-2">
          <button onClick={addTextItem} className="px-4 py-2 bg-blue-500 text-white rounded">Hinzufügen</button>
        </div>
      </div>}
      <div className="space-y-4">
        {project.items
          .sort((a: any, b: any) => a.order - b.order)
          .map((item: any) => (
            <div key={item.id} className="border p-4 rounded">
              {item.type === 'file' ? (
                <div className="flex items-center gap-2">
                  <button onClick={() => window.open(item.fileUrl, '_blank')} className="text-blue-500 underline">{item.fileName}</button>
                  {editMode && <button onClick={() => deleteItem(item.id)} className="ml-2 px-2 py-1 bg-red-500 text-white rounded text-sm">Löschen</button>}
                </div>
              ) : (
                <div className="border-2 border-gray-300 p-3 rounded bg-gray-50">
                  {editingItem === item.id ? (
                    <div>
                      <div
                        ref={editRef}
                        contentEditable
                        onInput={(e) => setItemContent(e.currentTarget.innerHTML)}
                        className="w-full p-2 border rounded mb-2"
                      />
                      <div className="flex gap-2 mb-2">
                        <button onClick={() => { document.getElementById(`edit-${item.id}`)?.focus(); document.execCommand('bold'); }} className="px-3 py-1 bg-gray-200 rounded" title="Fett"><strong>B</strong></button>
                        <button onClick={() => { document.getElementById(`edit-${item.id}`)?.focus(); document.execCommand('underline'); }} className="px-3 py-1 bg-gray-200 rounded" title="Unterstrichen"><u>U</u></button>
                        <label className="px-3 py-1 bg-gray-200 rounded cursor-pointer" title="Datei anhängen">
                          📎
                          <input
                            type="file"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                console.log('Datei ausgewählt:', file.name);
                                setSelectedFile(file);
                                await addFileItem();
                                e.target.value = '';
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                      {(item.content?.files?.length > 0 || attachedFiles.length > 0) && (
                        <div className="mt-3 space-y-1">
                          <p className="text-sm font-semibold text-gray-700">Angehängte Dateien:</p>
                          {item.content?.files?.map((file: any, index: number) => (
                            <div key={`existing-${index}`} className="flex items-center gap-2 bg-white p-2 rounded border">
                              <button onClick={() => window.open(file.fileUrl, '_blank')} className="text-blue-600 underline font-medium">{file.fileName}</button>
                              <button onClick={() => setRemovedFiles(prev => new Set([...prev, file.fileUrl]))} className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600">X</button>
                            </div>
                          ))}
                          {attachedFiles.map((file, index) => (
                            <div key={`new-${index}`} className="flex items-center gap-2 bg-white p-2 rounded border">
                              <button onClick={() => window.open(file.fileUrl, '_blank')} className="text-blue-600 underline font-medium">{file.fileName}</button>
                              <button onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== index))} className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600">X</button>
                            </div>
                          ))}
                        </div>
                      )}
                      <button onClick={saveEditedItem} className="px-4 py-2 bg-green-500 text-white rounded mr-2">Speichern</button>
                      <button onClick={() => { setEditingItem(null); setItemContent(''); setAttachedFiles([]); setRemovedFiles(new Set()); }} className="px-4 py-2 bg-gray-500 text-white rounded">Abbrechen</button>
                    </div>
                  ) : (
                    <>
                      <div dangerouslySetInnerHTML={{ __html: typeof item.content === 'string' ? item.content : (item.content?.text || '') }} />
                      {typeof item.content === 'object' && item.content?.files && item.content.files.length > 0 && (
                        <div className="mt-3 space-y-1">
                          <p className="text-sm font-semibold text-gray-700">Angehängte Dateien:</p>
                          {item.content.files.map((file: any, index: number) => (
                            <div key={index} className="flex items-center gap-2 bg-white p-2 rounded border">
                              <button onClick={() => window.open(file.fileUrl, '_blank')} className="text-blue-600 underline font-medium">{file.fileName}</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                  <div className="mt-2 flex gap-2">
                    {editMode && editingItem !== item.id && <button onClick={() => moveUp(item.id)} className="px-2 py-1 bg-gray-500 text-white rounded text-sm">↑</button>}
                    {editMode && editingItem !== item.id && <button onClick={() => moveDown(item.id)} className="px-2 py-1 bg-gray-500 text-white rounded text-sm">↓</button>}
                    {editMode && editingItem !== item.id && <button onClick={() => startEditItem(item)} className="px-2 py-1 bg-blue-500 text-white rounded text-sm">Bearbeiten</button>}
                    {editMode && <button onClick={() => deleteItem(item.id)} className="px-2 py-1 bg-red-500 text-white rounded text-sm">Löschen</button>}
                  </div>
                </div>
              )}
            </div>
          ))}
      </div>
      {editMode && <div className="mt-12 mb-8">
        <h3 className="text-lg font-semibold mb-2">Projekt löschen</h3>
        <input
          value={deleteCode}
          onChange={(e) => setDeleteCode(e.target.value)}
          placeholder="Codewort"
          className="p-2 border rounded mr-2"
        />
        <button onClick={deleteProject} className="px-4 py-2 bg-red-500 text-white rounded">Löschen</button>
      </div>}
    </div>
  );
}