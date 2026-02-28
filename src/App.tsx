import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Dashboard } from "./pages/Dashboard";
import { NewProject } from "./pages/NewProject";
import { ProjectDetail } from "./pages/ProjectDetail";
import { Login } from "./pages/Login";

const queryClient = new QueryClient();

function Navbar() {
  const { user, signOut } = useAuth();

  if (!user) return null;

  return (
    <nav className="glass-nav sticky top-0 z-50 h-14 flex items-center justify-between px-6">
      <Link to="/" className="font-bold text-foreground text-base flex items-center gap-1.5 tracking-tight">
        <span className="text-primary">●</span> AI Engineering Learning Studio
      </Link>
      <div className="flex items-center gap-3">
        <Link to="/new" className="btn-primary text-sm">
          New Project
        </Link>
        <button onClick={signOut} className="btn-ghost text-sm">
          Sign Out
        </button>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Navbar />
          <main className="relative z-10">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/new" element={<ProtectedRoute><NewProject /></ProtectedRoute>} />
              <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
            </Routes>
          </main>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
