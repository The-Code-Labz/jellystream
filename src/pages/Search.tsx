import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { searchItems } from '@/lib/jellyfin';
import { PosterGrid } from '@/components/PosterGrid';
import { SkeletonPosterGrid } from '@/components/Skeleton';
import type { JellyfinItem } from '@/lib/types';

export function Search() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [items, setItems] = useState<JellyfinItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const activeQuery = searchParams.get('q') || '';

  useEffect(() => {
    if (!user) return;
    if (!activeQuery) {
      setItems([]);
      setTotal(0);
      return;
    }
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await searchItems(user!.AccessToken, user!.Id, activeQuery, 50);
        setItems(res.Items);
        setTotal(res.TotalRecordCount);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, activeQuery]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) setSearchParams({ q: query.trim() });
    else setSearchParams({});
  };

  const clear = () => {
    setQuery('');
    setSearchParams({});
  };

  return (
    <div className="px-5 py-8 sm:px-8 lg:px-12">
      <h1 className="mb-1 text-2xl font-bold text-ink">
        {activeQuery ? `Results for “${activeQuery}”` : 'Search your Jellyfin library'}
      </h1>
      <p className="mb-6 text-sm text-muted">
        {activeQuery ? (loading ? 'Searching…' : `${total} result${total === 1 ? '' : 's'}`) : 'Find movies, series, and episodes by title.'}
      </p>

      <form onSubmit={submit} role="search" className="mb-8 max-w-2xl">
        <label htmlFor="search-field" className="sr-only">Search movies, shows, episodes</label>
        <div className="relative">
          <input
            id="search-field"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movies, shows, episodes…"
            className="h-14 w-full rounded-xl border border-border bg-surface pl-12 pr-11 text-base text-ink placeholder-muted outline-none focus-visible:border-accent"
          />
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden="true" />
          {query && (
            <button
              type="button"
              onClick={clear}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center text-muted hover:text-ink"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </form>

      {error ? (
        <p className="py-16 text-center text-sm text-danger">{error}</p>
      ) : loading ? (
        <SkeletonPosterGrid />
      ) : (
        <PosterGrid
          items={items}
          emptyState={
            activeQuery ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <p className="text-ink">No results for “{activeQuery}”.</p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={clear}
                    className="flex h-10 items-center rounded-lg bg-surface px-4 text-sm font-semibold text-ink hover:bg-surfaceHover"
                  >
                    Clear search
                  </button>
                  <Link to="/movies" className="text-sm font-medium text-accent hover:underline">Browse Movies</Link>
                  <Link to="/shows" className="text-sm font-medium text-accent hover:underline">Browse Series</Link>
                </div>
              </div>
            ) : (
              <p className="py-16 text-center text-muted">Start typing to search your library.</p>
            )
          }
        />
      )}
    </div>
  );
}
