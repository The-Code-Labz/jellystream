import { useId, useState } from 'react';
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
  const errorId = useId();

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
    <div className="grid min-h-screen grid-cols-1 bg-background lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-surface p-12 lg:flex lg:flex-col lg:justify-end">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 -top-24 h-[36rem] w-[36rem] rounded-full bg-accent/10 blur-3xl"
        />
        <div className="relative">
          <div className="mb-8 flex items-center gap-2 text-2xl font-extrabold text-ink">
            <Clapperboard className="h-7 w-7 text-accent" aria-hidden="true" />
            JellyStream
          </div>
          <h1 className="max-w-md text-4xl font-extrabold leading-tight text-ink xl:text-5xl">
            Your library.
            <br />
            Your screen.
          </h1>
          <p className="mt-4 max-w-sm text-base text-muted">
            Everything you already own, organized and ready to resume — no algorithms deciding what you watch next.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 text-xl font-extrabold text-ink lg:hidden">
            <Clapperboard className="h-6 w-6 text-accent" aria-hidden="true" />
            JellyStream
          </div>

          <h2 className="mb-1 text-2xl font-bold text-ink">Sign in to your Jellyfin server.</h2>
          <p className="mb-6 text-sm text-muted">Use the credentials you already use for your Jellyfin account.</p>

          <form onSubmit={submit} noValidate className="space-y-4">
            <div>
              <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-ink">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="h-11 w-full rounded-lg border border-border bg-surface px-4 text-ink outline-none focus-visible:border-accent"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  aria-describedby={error ? errorId : undefined}
                  className="h-11 w-full rounded-lg border border-border bg-surface px-4 pr-11 text-ink outline-none focus-visible:border-accent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center text-muted hover:text-ink"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p id={errorId} role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent font-semibold text-background transition-colors duration-180 hover:bg-accentHover disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Sign in
            </button>
          </form>

          <p className="mt-8 text-xs text-muted">
            Powered by Jellyfin. JellyStream is an independent client and is not affiliated with the Jellyfin project.
          </p>
        </div>
      </div>
    </div>
  );
}
