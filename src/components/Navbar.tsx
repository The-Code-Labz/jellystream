import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Search, LogOut, Clapperboard, Tv, Home as HomeIcon, Film, Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

const NAV_LINKS = [
  { to: '/', label: 'Home', icon: HomeIcon, end: true },
  { to: '/movies', label: 'Movies', icon: Film, end: false },
  { to: '/shows', label: 'Series', icon: Tv, end: false },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const accountButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setSearchOpen(false);
    setMenuOpen(false);
    setAccountOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!accountOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAccountOpen(false);
        accountButtonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [accountOpen]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setSearchOpen(false);
    }
  };

  const closeSearch = () => {
    setSearchOpen(false);
    searchButtonRef.current?.focus();
  };

  const initial = user?.Name?.trim()?.[0]?.toUpperCase() || '?';

  return (
    <nav
      className={`fixed left-0 right-0 top-0 z-50 h-[72px] transition-colors duration-220 ${
        scrolled ? 'bg-background/[.94] backdrop-blur-md border-b border-border' : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-full max-w-shell items-center gap-2 px-5 sm:px-8 lg:px-12">
        <Link to="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-ink">
          <Clapperboard className="h-6 w-6 text-accent" aria-hidden="true" />
          <span>JellyStream</span>
        </Link>

        <div className="hidden items-center gap-1 pl-6 text-sm font-semibold md:flex" role="navigation" aria-label="Primary">
          {NAV_LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex h-11 items-center gap-1.5 border-b-2 px-3 transition-colors duration-180 ${
                  isActive ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'
                }`
              }
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {searchOpen ? (
            <form
              onSubmit={submit}
              role="search"
              className="fixed inset-x-0 top-[72px] z-40 border-b border-border bg-background p-4 sm:static sm:z-auto sm:w-72 sm:border-0 sm:bg-transparent sm:p-0"
            >
              <label htmlFor="nav-search" className="sr-only">
                Search your Jellyfin library
              </label>
              <div className="relative">
                <input
                  ref={searchInputRef}
                  id="nav-search"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Escape' && closeSearch()}
                  placeholder="Search titles, people, genres…"
                  className="h-11 w-full rounded-lg border border-border bg-surface py-1.5 pl-10 pr-10 text-sm text-ink placeholder-muted outline-none focus-visible:border-accent"
                />
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                <button
                  type="button"
                  onClick={closeSearch}
                  aria-label="Close search"
                  className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded text-muted hover:text-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </form>
          ) : (
            <button
              ref={searchButtonRef}
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              className="flex h-11 w-11 items-center justify-center rounded-lg text-ink hover:bg-surfaceHover"
            >
              <Search className="h-5 w-5" />
            </button>
          )}

          <div className="relative" ref={accountRef}>
            <button
              ref={accountButtonRef}
              type="button"
              onClick={() => setAccountOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={accountOpen}
              aria-label={`Account menu for ${user?.Name || 'user'}`}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-sm font-semibold text-ink hover:bg-surfaceHover"
            >
              {initial}
            </button>
            {accountOpen && (
              <div
                role="menu"
                className="absolute right-0 top-14 w-48 overflow-hidden rounded-lg border border-border bg-surface shadow-xl"
              >
                <div className="border-b border-border px-4 py-3 text-sm text-muted">
                  Signed in as <span className="block truncate font-semibold text-ink">{user?.Name}</span>
                </div>
                <button
                  role="menuitem"
                  onClick={logout}
                  className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-ink hover:bg-surfaceHover hover:text-danger"
                >
                  <LogOut className="h-4 w-4" /> Log out
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Open navigation menu"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-ink hover:bg-surfaceHover md:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          role="navigation"
          aria-label="Primary"
          className="border-b border-border bg-background px-5 py-3 md:hidden"
        >
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold ${
                    isActive ? 'bg-surface text-ink' : 'text-muted hover:bg-surfaceHover hover:text-ink'
                  }`
                }
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
