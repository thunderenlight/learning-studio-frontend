import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { NewProject } from "./pages/NewProject";
import { ProjectDetail } from "./pages/ProjectDetail";

const queryClient = new QueryClient();

function Navbar() {
  return (
    <nav className="glass-nav sticky top-0 z-50 h-14 flex items-center justify-between px-6">
      <Link to="/" className="font-bold text-foreground text-base flex items-center gap-1.5 tracking-tight">
        <span className="text-primary">●</span> AI Engineering Learning Studio
      </Link>
      <Link to="/new" className="btn-primary text-sm">
        New Project
      </Link>
    </nav>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Navbar />
        <main className="relative z-10">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/new" element={<NewProject />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
          </Routes>
        </main>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
