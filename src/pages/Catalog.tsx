import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { fetchMovies, fetchSeries, fetchItems, fetchGenres } from '@/lib/jellyfin';
import { PosterGrid } from '@/components/PosterGrid';
import { SkeletonPosterGrid } from '@/components/Skeleton';
import type { JellyfinItem } from '@/lib/types';

interface CatalogProps {
  type?: 'Movie' | 'Series';
}

export function Catalog({ type }: CatalogProps) {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<JellyfinItem[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const selectedGenre = searchParams.get('genre') || '';
  const selectedYear = searchParams.get('year') || '';
  const sortBy = searchParams.get('sortBy') || 'SortName';
  const sortOrder = searchParams.get('sortOrder') || 'Ascending';
  const startIndex = parseInt(searchParams.get('startIndex') || '0', 10);
  const limit = 48;

  useEffect(() => {
    if (!user) return;
    async function load() {
      setLoading(true);
      try {
        const options = {
          genre: selectedGenre,
          year: selectedYear ? parseInt(selectedYear, 10) : undefined,
          sortBy,
          sortOrder,
          startIndex,
          limit,
        };
        let res;
        if (type === 'Movie') res = await fetchMovies(user!.AccessToken, user!.Id, options);
        else if (type === 'Series') res = await fetchSeries(user!.AccessToken, user!.Id, options);
        else {
          res = await fetchItems(user!.AccessToken, user!.Id, {
            Recursive: true,
            IncludeItemTypes: 'Movie,Series',
            ...(selectedGenre && { Genres: selectedGenre }),
            ...(selectedYear && { Years: parseInt(selectedYear, 10) }),
            SortBy: sortBy,
            SortOrder: sortOrder,
            StartIndex: startIndex,
            Limit: limit,
          });
        }
        setItems(res.Items);
        setTotal(res.TotalRecordCount);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, type, selectedGenre, selectedYear, sortBy, sortOrder, startIndex]);

  useEffect(() => {
    if (!user) return;
    fetchGenres(user.AccessToken).then((g) => setGenres(g.Items.map((x) => x.Name).sort())).catch(console.error);
  }, [user]);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('startIndex');
    setSearchParams(next);
  };

  const years = Array.from({ length: 40 }, (_, i) => String(new Date().getFullYear() - i));

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold text-white">{type === 'Movie' ? 'Movies' : type === 'Series' ? 'TV Shows' : 'Catalog'}</h1>

      <div className="mb-6 flex flex-wrap gap-3">
        <select
          value={selectedGenre}
          onChange={(e) => updateParam('genre', e.target.value)}
          className="rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm text-white outline-none focus:border-accent"
        >
          <option value="">All Genres</option>
          {genres.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>

        <select
          value={selectedYear}
          onChange={(e) => updateParam('year', e.target.value)}
          className="rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm text-white outline-none focus:border-accent"
        >
          <option value="">All Years</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>

        <select
          value={sortBy}
          onChange={(e) => updateParam('sortBy', e.target.value)}
          className="rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm text-white outline-none focus:border-accent"
        >
          <option value="SortName">Title</option>
          <option value="ProductionYear">Release Year</option>
          <option value="DateCreated">Date Added</option>
          <option value="CommunityRating">Rating</option>
        </select>

        <select
          value={sortOrder}
          onChange={(e) => updateParam('sortOrder', e.target.value)}
          className="rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm text-white outline-none focus:border-accent"
        >
          <option value="Ascending">Ascending</option>
          <option value="Descending">Descending</option>
        </select>
      </div>

      {loading ? <SkeletonPosterGrid /> : <PosterGrid items={items} />}

      <div className="mt-8 flex justify-center gap-3">
        <button
          disabled={startIndex === 0}
          onClick={() => updateParam('startIndex', String(Math.max(0, startIndex - limit)))}
          className="rounded-lg bg-surface px-4 py-2 text-sm text-white hover:bg-surfaceHover disabled:opacity-40"
        >
          Previous
        </button>
        <span className="self-center text-sm text-muted">
          {startIndex + 1}-{Math.min(startIndex + items.length, total)} of {total}
        </span>
        <button
          disabled={startIndex + limit >= total}
          onClick={() => updateParam('startIndex', String(startIndex + limit))}
          className="rounded-lg bg-surface px-4 py-2 text-sm text-white hover:bg-surfaceHover disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
