import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLibrary } from '@/context/LibraryContext';
import { fetchMovies, fetchSeries, fetchItems, fetchGenres } from '@/lib/jellyfin';
import { PosterGrid } from '@/components/PosterGrid';
import { SkeletonPosterGrid } from '@/components/Skeleton';
import type { JellyfinItem } from '@/lib/types';

interface CatalogProps {
  type?: 'Movie' | 'Series';
}

const DEFAULT_SORT_BY = 'SortName';
const DEFAULT_SORT_ORDER = 'Ascending';

export function Catalog({ type }: CatalogProps) {
  const { user } = useAuth();
  const { libraryId } = useLibrary();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<JellyfinItem[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);

  const selectedGenre = searchParams.get('genre') || '';
  const selectedYear = searchParams.get('year') || '';
  const selectedItemType = searchParams.get('itemType') || '';
  const selectedLetter = searchParams.get('letter') || '';
  const sortBy = searchParams.get('sortBy') || DEFAULT_SORT_BY;
  const sortOrder = searchParams.get('sortOrder') || DEFAULT_SORT_ORDER;
  const startIndex = parseInt(searchParams.get('startIndex') || '0', 10);
  const limit = 48;

  const prevLibraryId = useRef(libraryId);
  useEffect(() => {
    if (prevLibraryId.current !== libraryId) {
      prevLibraryId.current = libraryId;
      if (searchParams.has('startIndex')) {
        const next = new URLSearchParams(searchParams);
        next.delete('startIndex');
        setSearchParams(next);
      }
    }
  }, [libraryId, searchParams, setSearchParams]);

  useEffect(() => {
    if (!user) return;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const options = {
          genre: selectedGenre,
          year: selectedYear ? parseInt(selectedYear, 10) : undefined,
          sortBy,
          sortOrder,
          startIndex,
          limit,
          libraryId: libraryId || undefined,
          nameStartsWith: selectedLetter || undefined,
        };
        let res;
        if (type === 'Movie') res = await fetchMovies(user!.AccessToken, user!.Id, options);
        else if (type === 'Series') res = await fetchSeries(user!.AccessToken, user!.Id, options);
        else {
          res = await fetchItems(user!.AccessToken, user!.Id, {
            Recursive: true,
            IncludeItemTypes: selectedItemType || 'Movie,Series',
            ...(selectedGenre && { Genres: selectedGenre }),
            ...(selectedYear && { Years: parseInt(selectedYear, 10) }),
            ...(libraryId && { ParentId: libraryId }),
            ...(selectedLetter && { NameStartsWith: selectedLetter }),
            SortBy: sortBy,
            SortOrder: sortOrder,
            StartIndex: startIndex,
            Limit: limit,
          });
        }
        setItems(res.Items);
        setTotal(res.TotalRecordCount);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load the catalog.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, type, selectedGenre, selectedYear, selectedItemType, selectedLetter, sortBy, sortOrder, startIndex, libraryId]);

  useEffect(() => {
    if (!user) return;
    fetchGenres(user.AccessToken, libraryId || undefined)
      .then((g) => setGenres(g.Items.map((x) => x.Name).sort()))
      .catch(() => null);
  }, [user, libraryId]);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'startIndex') next.delete('startIndex');
    setSearchParams(next);
  };

  const resetFilters = () => setSearchParams({});

  const filtersActive = Boolean(
    selectedGenre || selectedYear || selectedItemType || selectedLetter ||
    sortBy !== DEFAULT_SORT_BY || sortOrder !== DEFAULT_SORT_ORDER
  );

  const years = Array.from({ length: 40 }, (_, i) => String(new Date().getFullYear() - i));
  const pageTitle = type === 'Movie' ? 'Movies' : type === 'Series' ? 'Series' : 'Catalog';
  const ALPHABET = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

  const activeFilterLabels = [
    selectedGenre && `Genre: ${selectedGenre}`,
    selectedYear && `Year: ${selectedYear}`,
    selectedItemType && `Type: ${selectedItemType}`,
    selectedLetter && `Starts with: ${selectedLetter}`,
  ].filter(Boolean) as string[];

  return (
    <div className="pb-16">
      <div className="px-5 pt-6 sm:px-8 lg:px-12">
        <h1 className="text-2xl font-bold text-ink">{pageTitle}</h1>
        <p className="mt-1 text-sm text-muted">{loading ? 'Loading…' : `${total} title${total === 1 ? '' : 's'}`}</p>
      </div>

      <div className="sticky top-[calc(72px_+_env(safe-area-inset-top))] z-30 mt-4 border-y border-border bg-background/95 px-5 py-3 backdrop-blur sm:px-8 lg:px-12">
        <div className="flex flex-wrap items-end gap-3">
          {!type && (
            <div className="flex flex-col gap-1">
              <label htmlFor="filter-type" className="text-xs font-medium text-muted">Type</label>
              <select
                id="filter-type"
                value={selectedItemType}
                onChange={(e) => updateParam('itemType', e.target.value)}
                className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus-visible:border-accent"
              >
                <option value="">Movies &amp; Series</option>
                <option value="Movie">Movies</option>
                <option value="Series">Series</option>
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label htmlFor="filter-genre" className="text-xs font-medium text-muted">Genre</label>
            <select
              id="filter-genre"
              value={selectedGenre}
              onChange={(e) => updateParam('genre', e.target.value)}
              className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus-visible:border-accent"
            >
              <option value="">All genres</option>
              {genres.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="filter-year" className="text-xs font-medium text-muted">Year</label>
            <select
              id="filter-year"
              value={selectedYear}
              onChange={(e) => updateParam('year', e.target.value)}
              className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus-visible:border-accent"
            >
              <option value="">All years</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="filter-sort" className="text-xs font-medium text-muted">Sort</label>
            <select
              id="filter-sort"
              value={sortBy}
              onChange={(e) => updateParam('sortBy', e.target.value)}
              className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus-visible:border-accent"
            >
              <option value="SortName">Title</option>
              <option value="ProductionYear">Release year</option>
              <option value="DateCreated">Date added</option>
              <option value="CommunityRating">Rating</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="filter-direction" className="text-xs font-medium text-muted">Direction</label>
            <select
              id="filter-direction"
              value={sortOrder}
              onChange={(e) => updateParam('sortOrder', e.target.value)}
              className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus-visible:border-accent"
            >
              <option value="Ascending">Ascending</option>
              <option value="Descending">Descending</option>
            </select>
          </div>

          <button
            type="button"
            onClick={resetFilters}
            disabled={!filtersActive}
            className="flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted hover:bg-surfaceHover hover:text-ink disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
        </div>

        {/* A-Z picker — horizontal scroll strip on all breakpoints (mirrors the fixed sidebar below on lg+). */}
        <div className="mt-3 flex gap-1 overflow-x-auto pb-1 lg:hidden" aria-label="Filter by starting letter">
          {ALPHABET.map((letter) => (
            <button
              key={letter}
              type="button"
              onClick={() => updateParam('letter', selectedLetter === letter ? '' : letter)}
              aria-pressed={selectedLetter === letter}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-semibold transition-colors ${
                selectedLetter === letter ? 'bg-accent text-background' : 'bg-surface text-muted hover:bg-surfaceHover hover:text-ink'
              }`}
            >
              {letter}
            </button>
          ))}
        </div>
      </div>

      {/* Jellyfin-style fixed vertical A-Z sidebar, desktop only. */}
      <div
        className="fixed right-1 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-0.5 rounded-full bg-surface/80 px-1 py-2 backdrop-blur lg:flex"
        aria-label="Filter by starting letter"
      >
        {ALPHABET.map((letter) => (
          <button
            key={letter}
            type="button"
            onClick={() => updateParam('letter', selectedLetter === letter ? '' : letter)}
            aria-pressed={selectedLetter === letter}
            className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold leading-none transition-colors ${
              selectedLetter === letter ? 'bg-accent text-background' : 'text-muted hover:bg-surfaceHover hover:text-ink'
            }`}
          >
            {letter}
          </button>
        ))}
      </div>

      <div className="px-5 pt-6 sm:px-8 lg:px-12 lg:pr-16">
        {error ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm text-danger">{error}</p>
          </div>
        ) : loading ? (
          <SkeletonPosterGrid />
        ) : (
          <PosterGrid
            items={items}
            emptyState={
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <p className="text-ink">
                  No titles match {activeFilterLabels.length > 0 ? activeFilterLabels.join(', ') : 'the current filters'}.
                </p>
                <button
                  onClick={resetFilters}
                  className="flex h-10 items-center gap-1.5 rounded-lg bg-surface px-4 text-sm font-semibold text-ink hover:bg-surfaceHover"
                >
                  <RotateCcw className="h-4 w-4" /> Reset filters
                </button>
              </div>
            }
          />
        )}

        {!loading && !error && total > 0 && (
          <div className="mt-8 flex items-center justify-between">
            <button
              disabled={startIndex === 0}
              onClick={() => updateParam('startIndex', String(Math.max(0, startIndex - limit)))}
              className="flex h-11 items-center rounded-lg bg-surface px-4 text-sm font-medium text-ink hover:bg-surfaceHover disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-sm text-muted">
              {startIndex + 1}–{Math.min(startIndex + items.length, total)} of {total}
            </span>
            <button
              disabled={startIndex + limit >= total}
              onClick={() => updateParam('startIndex', String(startIndex + limit))}
              className="flex h-11 items-center rounded-lg bg-surface px-4 text-sm font-medium text-ink hover:bg-surfaceHover disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
