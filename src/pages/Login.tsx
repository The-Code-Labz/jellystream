import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { authenticate } from '@/lib/jellyfin';
import { Clapperboard, Eye, EyeOff, Loader2 } from 'lucide-react';

export function Login() {
  const { setUser } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await authenticate(username, password);
      setUser(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[url('/hero-bg.jpg')] bg-cover bg-center px-4">
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-surface/90 p-8 backdrop-blur">
        <div className="mb-6 flex items-center justify-center gap-2 text-3xl font-black text-accent">
          <Clapperboard className="h-8 w-8" />
          JellyStream
        </div>
        <h1 className="mb-6 text-center text-2xl font-bold text-white">Sign in with Jellyfin</h1>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-muted">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full rounded-lg border border-white/10 bg-background px-4 py-2.5 text-white outline-none focus:border-accent"
            />
          </div>
          <div className="relative">
            <label className="mb-1 block text-sm text-muted">Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-white/10 bg-background px-4 py-2.5 pr-10 text-white outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-8 text-muted hover:text-white"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error && <p className="rounded bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-2.5 font-semibold text-white transition hover:bg-accentHover disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
