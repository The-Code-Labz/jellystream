import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = searchParams.get('q');
    if (!q) {
      setItems([]);
      return;
    }
    async function load() {
      setLoading(true);
      try {
        const res = await searchItems(user!.AccessToken, user!.Id, q!, 50);
        setItems(res.Items);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, searchParams]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) setSearchParams({ q: query.trim() });
    else setSearchParams({});
  };

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold text-white">Search</h1>

      <form onSubmit={submit} className="mb-8 max-w-2xl">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movies, shows, episodes..."
            className="w-full rounded-xl border border-white/10 bg-surface py-3 pl-12 pr-10 text-white placeholder-muted outline-none focus:border-accent"
          />
          <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setSearchParams({}); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <SkeletonPosterGrid />
      ) : (
        <PosterGrid
          items={items}
          emptyText={searchParams.get('q') ? `No results for "${searchParams.get('q')}"` : 'Start typing to search your library.'}
        />
      )}
    </div>
  );
}
