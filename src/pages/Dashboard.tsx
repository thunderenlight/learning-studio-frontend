import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { listProjects } from "../api/client";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ProjectCard } from "../components/ProjectCard";

export function Dashboard() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["projects"],
    queryFn: listProjects,
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
          My Learning Projects
        </h1>
        <p className="text-secondary-custom mt-1">
          Track your AI engineering learning journey
        </p>
      </div>

      {isLoading && <LoadingSpinner />}

      {isError && (
        <div className="glass-card p-6 border-destructive/30">
          <p className="text-destructive font-semibold">
            Failed to load projects
          </p>
          <p className="text-secondary-custom text-sm mt-1">
            {(error as Error).message}. Check your API connection and try again.
          </p>
        </div>
      )}

      {data && data.projects.length === 0 && (
        <div
          className="glass-card p-12 flex flex-col items-center gap-4 text-center"
          style={{ borderStyle: "dashed", borderColor: "rgba(108,99,255,0.3)" }}
        >
          <span className="text-5xl">✦</span>
          <h2 className="text-xl font-bold text-foreground">No projects yet</h2>
          <p className="text-secondary-custom text-sm max-w-md">
            Describe what you want to build and our AI planner will create a
            personalized learning path for you.
          </p>
          <button className="btn-primary" onClick={() => navigate("/new")}>
            Create your first project
          </button>
        </div>
      )}

      {data && data.projects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {data.projects.map((p) => (
            <ProjectCard key={p.projectId} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}
