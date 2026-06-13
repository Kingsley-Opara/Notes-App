'use client';
import { useEffect, useState, useCallback } from 'react';
import { NotebookPen, Plus, Trash2, Pencil, X, Check, Search } from 'lucide-react';

interface Note {
  usersnoteId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  userEmail: string;
}

type View = 'grid' | 'create' | 'edit';

export default function Dashboard() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<View>('grid');
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    fetchNotes();
    fetchUser();
  }, []);

  // ── Debounced search ─────────────────────────────────────────
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredNotes(notes);
      return;
    }

    const timer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 400); // wait 400ms after user stops typing

    return () => clearTimeout(timer);
  }, [searchQuery, notes]);

  async function fetchUser() {
    try {
      const res = await fetch('/api/auth/sync', { method: 'POST' });
      const data = await res.json();
      if (data.email) setUserEmail(data.email);
    } catch {}
  }

  async function fetchNotes() {
    try {
      setLoading(true);
      const res = await fetch('/api/notes');
      const data = await res.json();
      setNotes(data.notes ?? []);
      setFilteredNotes(data.notes ?? []);
    } catch {
      setError('Failed to load notes');
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(query: string) {
    if (!query.trim()) {
      setFilteredNotes(notes);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/notes/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setFilteredNotes(data.notes ?? []);
    } catch {
      setError('Search failed');
    } finally {
      setSearching(false);
    }
  }

  function clearSearch() {
    setSearchQuery('');
    setFilteredNotes(notes);
  }

  async function handleCreate() {
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content: content.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNotes(prev => [data.note, ...prev]);
      setFilteredNotes(prev => [data.note, ...prev]);
      resetForm();
      setView('grid');
    } catch (err: any) {
      setError(err.message ?? 'Failed to create note');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate() {
    if (!activeNote) return;
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/notes/${activeNote.usersnoteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content: content.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const updated = notes.map(n =>
        n.usersnoteId === activeNote.usersnoteId ? data.note : n
      );
      setNotes(updated);
      setFilteredNotes(updated);
      resetForm();
      setView('grid');
    } catch (err: any) {
      setError(err.message ?? 'Failed to update note');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(noteId: string) {
    setDeleting(noteId);
    try {
      const res = await fetch(`/api/notes/${noteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      const updated = notes.filter(n => n.usersnoteId !== noteId);
      setNotes(updated);
      setFilteredNotes(updated);
    } catch {
      setError('Failed to delete note');
    } finally {
      setDeleting(null);
    }
  }

  function openEdit(note: Note) {
    setActiveNote(note);
    setTitle(note.title);
    setContent(note.content);
    setError('');
    setView('edit');
  }

  function openCreate() {
    resetForm();
    setView('create');
  }

  function resetForm() {
    setTitle('');
    setContent('');
    setActiveNote(null);
    setError('');
  }

  function formatDate(iso: string) {
    const [datePart] = iso.split('T');
    const [year, month, day] = datePart.split('-');
    return `${month}/${day}/${year}`;
  }

  const displayNotes = searchQuery ? filteredNotes : notes;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <NotebookPen className="h-5 w-5 text-gray-800" />
          <span className="font-semibold text-gray-800">Notes</span>
        </div>
        <div className="flex items-center gap-4">
          {userEmail && (
            <span className="text-sm text-gray-500 hidden sm:block">
              {userEmail}
            </span>
          )}
          <button
            onClick={openCreate}
            className="flex items-center gap-1 bg-gray-800 text-white text-sm px-3 h-9 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            New note
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* ── Grid view ─────────────────────────────────────── */}
        {view === 'grid' && (
          <>
            <div className="flex items-center justify-between mb-6 gap-4">
              <h1 className="text-xl font-semibold text-gray-800 shrink-0">
                {searchQuery
                  ? `${filteredNotes.length} result${filteredNotes.length !== 1 ? 's' : ''}`
                  : notes.length > 0
                  ? `${notes.length} note${notes.length !== 1 ? 's' : ''}`
                  : 'Your notes'}
              </h1>

              {/* ── Search bar ── */}
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search notes..."
                  className="w-full h-9 pl-9 pr-8 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 transition"
                />
                {/* Clear button */}
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {['skeleton-1', 'skeleton-2', 'skeleton-3'].map(key => (
                  <div
                    key={key}
                    className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse"
                  >
                    <div className="h-4 bg-gray-100 rounded w-3/4 mb-3" />
                    <div className="h-3 bg-gray-100 rounded w-full mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-5/6" />
                  </div>
                ))}
              </div>
            ) : searching ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {['s-1', 's-2', 's-3'].map(key => (
                  <div
                    key={key}
                    className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse"
                  >
                    <div className="h-4 bg-gray-100 rounded w-3/4 mb-3" />
                    <div className="h-3 bg-gray-100 rounded w-full mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-5/6" />
                  </div>
                ))}
              </div>
            ) : displayNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <NotebookPen className="h-10 w-10 text-gray-300 mb-4" />
                {searchQuery ? (
                  <>
                    <h2 className="text-lg font-medium text-gray-600 mb-1">
                      No results found
                    </h2>
                    <p className="text-sm text-gray-400 mb-6">
                      No notes match "{searchQuery}"
                    </p>
                    <button
                      onClick={clearSearch}
                      className="text-sm text-gray-600 underline"
                    >
                      Clear search
                    </button>
                  </>
                ) : (
                  <>
                    <h2 className="text-lg font-medium text-gray-600 mb-1">
                      No notes yet
                    </h2>
                    <p className="text-sm text-gray-400 mb-6">
                      Create your first note to get started
                    </p>
                    <button
                      onClick={openCreate}
                      className="flex items-center gap-2 bg-gray-800 text-white text-sm px-5 h-9 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Create note
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayNotes.map(note => (
                  <div
                    key={note.usersnoteId}
                    className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3 hover:border-gray-300 hover:shadow-sm transition-all group"
                  >
                    <h3 className="font-semibold text-gray-800 truncate">
                      {note.title}
                    </h3>
                    <p className="text-sm text-gray-500 line-clamp-3 flex-1">
                      {note.content}
                    </p>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <span className="text-xs text-gray-400">
                        {formatDate(note.updatedAt)}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(note)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(note.usersnoteId)}
                          disabled={deleting === note.usersnoteId}
                          className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          {deleting === note.usersnoteId ? (
                            <span className="text-xs">...</span>
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Create / Edit form ───────────────────────────── */}
        {(view === 'create' || view === 'edit') && (
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-xl font-semibold text-gray-800">
                {view === 'create' ? 'New note' : 'Edit note'}
              </h1>
              <button
                onClick={() => { resetForm(); setView('grid'); }}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
                {error}
              </div>
            )}

            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm space-y-7">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Give your note a title..."
                  className="w-full h-12 rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm transition-all duration-200 focus:border-gray-300 focus:bg-white focus:ring-4 focus:ring-gray-100 focus:outline-none hover:border-gray-300"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Content
                </label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Start writing your thoughts..."
                  rows={12}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm transition-all duration-200 resize-none focus:border-gray-300 focus:bg-white focus:ring-4 focus:ring-gray-100 focus:outline-none hover:border-gray-300 leading-6"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => { resetForm(); setView('grid'); }}
                  className="px-4 h-9 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={view === 'create' ? handleCreate : handleUpdate}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 h-9 text-sm text-white bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  {saving
                    ? 'Saving...'
                    : view === 'create'
                    ? 'Create note'
                    : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}