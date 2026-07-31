import { Link, useNavigate } from 'react-router-dom';
import { Search, LogOut, Clapperboard, Tv, Home, Film } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 bg-background/80 backdrop-blur-md">
      <div className="flex h-16 items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 text-xl font-black text-accent">
          <Clapperboard className="h-6 w-6" />
          JellyStream
        </Link>

        <div className="hidden items-center gap-6 px-6 text-sm font-medium text-white md:flex">
          <Link to="/" className="flex items-center gap-1 hover:text-accent">
            <Home className="h-4 w-4" /> Home
          </Link>
          <Link to="/movies" className="flex items-center gap-1 hover:text-accent">
            <Film className="h-4 w-4" /> Movies
          </Link>
          <Link to="/shows" className="flex items-center gap-1 hover:text-accent">
            <Tv className="h-4 w-4" /> TV Shows
          </Link>
        </div>

        <form onSubmit={submit} className="ml-auto flex max-w-md flex-1 items-center">
          <div className="relative w-full">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles, people, genres..."
              className="w-full rounded-full border border-white/10 bg-surface py-1.5 pl-10 pr-4 text-sm text-white placeholder-muted outline-none focus:border-accent"
            />
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          </div>
        </form>

        <div className="flex items-center gap-3 pl-4">
          <span className="hidden text-sm text-muted sm:inline">{user?.Name}</span>
          <button onClick={logout} className="rounded-full bg-surface p-2 text-white hover:bg-surfaceHover" title="Log out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </nav>
  );
}
