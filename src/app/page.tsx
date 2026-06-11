'use client'
import { useEffect, useState } from "react";
import { NotebookPen, Lock, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    fetch('/api/auth', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        console.log('Sync result:', data);
        if (data.email) {
          setUser({ email: data.email });
        }
        setSynced(true);
      })
      .catch(err => {
        console.error('Sync failed:', err);
        setSynced(true);
      });
  }, []);

  return (
    <div className="flex min-h-screen w-screen flex-col bg-white">
      <header className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <NotebookPen className="h-5 w-5" />
          <span className="font-semibold">Notes</span>
        </div>

        {synced && (
          user ? (
            <span className="text-sm text-gray-600">{user.email}</span>
          ) : (
            <button
              onClick={() => router.push('/auth')}
              className="bg-gray-800 w-fit h-8 rounded-xl text-white cursor-pointer hover:bg-gray-500 px-4"
            >
              Sign in
            </button>
          )
        )}
      </header>

      <main className="flex-1 px-6 pt-20 pb-24 text-center w-full">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-foreground">
          Your thoughts, organized.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground max-w-xl mx-auto">
          A clean, secure place to capture, edit, and revisit your notes — from anywhere.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            onClick={() => router.push('/notes')}
            className="bg-gray-800 w-50 h-10 rounded-xl text-white cursor-pointer hover:bg-gray-500 px-5"
          >
            Get started — it's free
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mt-16 text-left">
          <div className="rounded-lg border bg-card p-5">
            <Sparkles className="h-5 w-5 mb-3" />
            <h3 className="font-semibold">Distraction-free</h3>
            <p className="text-sm text-muted-foreground mt-1">
              A minimal editor that gets out of your way.
            </p>
          </div>
          <div className="rounded-lg border bg-card p-5">
            <Lock className="h-5 w-5 mb-3" />
            <h3 className="font-semibold">Private by default</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Only you can read your notes.
            </p>
          </div>
          <div className="rounded-lg border bg-card p-5">
            <NotebookPen className="h-5 w-5 mb-3" />
            <h3 className="font-semibold">Always synced</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Your notes follow you to every device.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}