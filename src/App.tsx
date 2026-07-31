import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Login } from '@/pages/Login';
import { Home } from '@/pages/Home';
import { Catalog } from '@/pages/Catalog';
import { Detail } from '@/pages/Detail';
import { Watch } from '@/pages/Watch';
import { Search } from '@/pages/Search';

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-[72px]">{children}</main>
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

/** Watch route owns its own minimal top bar — never pair it with the global Navbar. */
function RequireAuthBare({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function GuestOnly({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/" element={<RequireAuth><Home /></RequireAuth>} />
      <Route path="/movies" element={<RequireAuth><Catalog type="Movie" /></RequireAuth>} />
      <Route path="/shows" element={<RequireAuth><Catalog type="Series" /></RequireAuth>} />
      <Route path="/catalog" element={<RequireAuth><Catalog /></RequireAuth>} />
      <Route path="/search" element={<RequireAuth><Search /></RequireAuth>} />
      <Route path="/item/:id" element={<RequireAuth><Detail /></RequireAuth>} />
      <Route path="/watch/:id" element={<RequireAuthBare><Watch /></RequireAuthBare>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
