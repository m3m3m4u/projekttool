"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface InfoFile {
  fileName: string;
  fileUrl: string;
  originalName: string;
  uploadedAt: string;
}

interface InfoItem {
  _id: string;
  category: string;
  title: string;
  files: InfoFile[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

type Category = 'personalvertretung' | 'kurse' | 'mittwochsnotizen';

const CATEGORIES: { key: Category; label: string; icon: string }[] = [
  { key: 'personalvertretung', label: 'Informationen der Personalvertretung', icon: '👥' },
  { key: 'kurse', label: 'Kurse und Fortbildungen', icon: '📚' },
  { key: 'mittwochsnotizen', label: 'Mittwochsnotizen', icon: '📝' },
];

export default function InfosPage() {
  const [items, setItems] = useState<InfoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category>('personalvertretung');
  
  // Admin state
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCode, setAdminCode] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  
  // Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  
  // Edit state
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  
  // Drag state
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const additionalFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/infos');
      if (!res.ok) throw new Error('Fehler beim Laden');
      const data = await res.json();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = () => {
    if (adminCode === '872020') {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setAdminCode('');
    } else {
      alert('Ungültiger Zugangscode');
    }
  };

  const handleAddItem = async () => {
    if (!newTitle.trim()) {
      alert('Bitte einen Titel eingeben');
      return;
    }
    
    try {
      setUploading(true);
      
      // Zuerst Dateien hochladen
      const uploadedFiles: InfoFile[] = [];
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('code', '872020');
        formData.append('category', activeCategory);
        
        const res = await fetch('/api/infos/upload', {
          method: 'POST',
          body: formData
        });
        
        if (!res.ok) throw new Error('Upload fehlgeschlagen');
        const data = await res.json();
        uploadedFiles.push({
          fileName: data.fileName,
          fileUrl: data.fileUrl,
          originalName: data.originalName,
          uploadedAt: new Date().toISOString()
        });
      }
      
      // Dann Item erstellen
      const res = await fetch('/api/infos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: '872020',
          category: activeCategory,
          title: newTitle.trim(),
          files: uploadedFiles
        })
      });
      
      if (!res.ok) throw new Error('Fehler beim Erstellen');
      
      await fetchItems();
      setNewTitle('');
      setSelectedFiles([]);
      setShowAddForm(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Fehler');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Dieses Element wirklich löschen? Alle zugehörigen Dateien werden ebenfalls gelöscht.')) {
      return;
    }
    
    try {
      const res = await fetch(`/api/infos/${id}?code=872020`, {
        method: 'DELETE'
      });
      
      if (!res.ok) throw new Error('Fehler beim Löschen');
      await fetchItems();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Fehler');
    }
  };

  const handleUpdateTitle = async (id: string) => {
    if (!editTitle.trim()) return;
    
    try {
      const res = await fetch(`/api/infos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: '872020',
          title: editTitle.trim()
        })
      });
      
      if (!res.ok) throw new Error('Fehler beim Aktualisieren');
      await fetchItems();
      setEditingItem(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Fehler');
    }
  };

  const handleAddFiles = async (id: string) => {
    if (additionalFiles.length === 0) return;
    
    try {
      setUploading(true);
      const item = items.find(i => i._id === id);
      if (!item) return;
      
      const newFiles: InfoFile[] = [...item.files];
      
      for (const file of additionalFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('code', '872020');
        formData.append('category', activeCategory);
        
        const res = await fetch('/api/infos/upload', {
          method: 'POST',
          body: formData
        });
        
        if (!res.ok) throw new Error('Upload fehlgeschlagen');
        const data = await res.json();
        newFiles.push({
          fileName: data.fileName,
          fileUrl: data.fileUrl,
          originalName: data.originalName,
          uploadedAt: new Date().toISOString()
        });
      }
      
      const res = await fetch(`/api/infos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: '872020',
          files: newFiles
        })
      });
      
      if (!res.ok) throw new Error('Fehler beim Aktualisieren');
      await fetchItems();
      setAdditionalFiles([]);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Fehler');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = async (itemId: string, fileIndex: number) => {
    const item = items.find(i => i._id === itemId);
    if (!item) return;
    
    if (!confirm('Diese Datei wirklich entfernen?')) return;
    
    const newFiles = item.files.filter((_, i) => i !== fileIndex);
    
    try {
      const res = await fetch(`/api/infos/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: '872020',
          files: newFiles
        })
      });
      
      if (!res.ok) throw new Error('Fehler beim Aktualisieren');
      await fetchItems();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Fehler');
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItem(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetId) {
      setDraggedItem(null);
      return;
    }
    
    const categoryItems = items
      .filter(i => i.category === activeCategory)
      .sort((a, b) => b.order - a.order);
    
    const draggedIndex = categoryItems.findIndex(i => i._id === draggedItem);
    const targetIndex = categoryItems.findIndex(i => i._id === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedItem(null);
      return;
    }
    
    // Reorder
    const newOrder = [...categoryItems];
    const [removed] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, removed);
    
    const orderedIds = newOrder.map(i => i._id);
    
    try {
      const res = await fetch('/api/infos/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: '872020',
          category: activeCategory,
          orderedIds
        })
      });
      
      if (!res.ok) throw new Error('Fehler beim Sortieren');
      await fetchItems();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Fehler');
    }
    
    setDraggedItem(null);
  };

  const getProxyUrl = (url: string) => {
    return `/api/download?url=${encodeURIComponent(url)}`;
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.toLowerCase().split('.').pop();
    switch (ext) {
      case 'pdf': return '📕';
      case 'doc':
      case 'docx': return '📘';
      case 'xls':
      case 'xlsx': return '📗';
      case 'ppt':
      case 'pptx': return '📙';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return '🖼️';
      case 'zip':
      case 'rar': return '📦';
      default: return '📄';
    }
  };

  const categoryItems = items
    .filter(i => i.category === activeCategory)
    .sort((a, b) => b.order - a.order);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-blue-600 hover:text-blue-800">
              ← Zurück
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Infos</h1>
          </div>
          
          {!isAdmin ? (
            <button
              onClick={() => setShowAdminLogin(true)}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              🔐 Admin
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-green-600 text-sm">✓ Admin-Modus</span>
              <button
                onClick={() => setIsAdmin(false)}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                Abmelden
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Admin Login Modal */}
      {showAdminLogin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Admin-Zugang</h3>
            <input
              type="password"
              value={adminCode}
              onChange={e => setAdminCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
              placeholder="Zugangscode eingeben"
              className="w-full p-2 border rounded mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleAdminLogin}
                className="flex-1 bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
              >
                Anmelden
              </button>
              <button
                onClick={() => { setShowAdminLogin(false); setAdminCode(''); }}
                className="flex-1 bg-gray-300 py-2 rounded hover:bg-gray-400"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeCategory === cat.key
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        {/* Add Button (Admin only) */}
        {isAdmin && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="mb-6 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
          >
            + Neuen Eintrag hinzufügen
          </button>
        )}

        {/* Add Form */}
        {isAdmin && showAddForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Neuer Eintrag</h3>
            <input
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Titel des Eintrags"
              className="w-full p-2 border rounded mb-4"
            />
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Dateien auswählen</label>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={e => setSelectedFiles(Array.from(e.target.files || []))}
                className="w-full"
              />
              {selectedFiles.length > 0 && (
                <div className="mt-2 text-sm text-gray-600">
                  {selectedFiles.length} Datei(en) ausgewählt
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleAddItem}
                disabled={uploading}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
              >
                {uploading ? 'Wird hochgeladen...' : 'Speichern'}
              </button>
              <button
                onClick={() => { setShowAddForm(false); setNewTitle(''); setSelectedFiles([]); }}
                className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {/* Items List */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Lädt...</div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">{error}</div>
        ) : categoryItems.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Noch keine Einträge in dieser Kategorie.
          </div>
        ) : (
          <div className="space-y-4">
            {categoryItems.map(item => (
              <div
                key={item._id}
                draggable={isAdmin}
                onDragStart={e => isAdmin && handleDragStart(e, item._id)}
                onDragOver={isAdmin ? handleDragOver : undefined}
                onDrop={e => isAdmin && handleDrop(e, item._id)}
                className={`bg-white rounded-lg shadow p-4 ${
                  isAdmin ? 'cursor-move' : ''
                } ${draggedItem === item._id ? 'opacity-50' : ''}`}
              >
                {/* Item Header */}
                <div className="flex items-start justify-between mb-3">
                  {editingItem === item._id ? (
                    <div className="flex gap-2 flex-1 mr-4">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        className="flex-1 p-2 border rounded"
                        autoFocus
                      />
                      <button
                        onClick={() => handleUpdateTitle(item._id)}
                        className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => setEditingItem(null)}
                        className="bg-gray-300 px-3 py-1 rounded hover:bg-gray-400"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                  )}
                  
                  {isAdmin && editingItem !== item._id && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setEditingItem(item._id); setEditTitle(item.title); }}
                        className="text-blue-500 hover:text-blue-700 text-sm"
                      >
                        ✏️ Umbenennen
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item._id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        🗑️ Löschen
                      </button>
                    </div>
                  )}
                </div>

                {/* Files */}
                <div className="space-y-2">
                  {item.files.map((file, fileIndex) => (
                    <div
                      key={fileIndex}
                      className="flex items-center justify-between bg-gray-50 rounded p-2 group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{getFileIcon(file.originalName)}</span>
                        <a
                          href={getProxyUrl(file.fileUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {file.originalName}
                        </a>
                      </div>
                      
                      <div className="flex gap-2">
                        <a
                          href={getProxyUrl(file.fileUrl)}
                          download={file.originalName}
                          className="text-gray-500 hover:text-gray-700 text-sm"
                        >
                          ⬇️ Download
                        </a>
                        {isAdmin && (
                          <button
                            onClick={() => handleRemoveFile(item._id, fileIndex)}
                            className="text-red-500 hover:text-red-700 text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add more files (Admin only) */}
                {isAdmin && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex gap-2 items-center">
                      <input
                        ref={additionalFileInputRef}
                        type="file"
                        multiple
                        onChange={e => setAdditionalFiles(Array.from(e.target.files || []))}
                        className="text-sm"
                      />
                      {additionalFiles.length > 0 && (
                        <button
                          onClick={() => handleAddFiles(item._id)}
                          disabled={uploading}
                          className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 disabled:bg-gray-400"
                        >
                          {uploading ? 'Lädt...' : `${additionalFiles.length} Datei(en) hinzufügen`}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Timestamp */}
                <div className="mt-2 text-xs text-gray-400">
                  Erstellt: {new Date(item.createdAt).toLocaleDateString('de-DE')}
                  {item.updatedAt !== item.createdAt && (
                    <> · Aktualisiert: {new Date(item.updatedAt).toLocaleDateString('de-DE')}</>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
