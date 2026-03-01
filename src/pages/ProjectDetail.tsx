import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { getProject, deleteProject } from "../api/client";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ModuleCard } from "../components/ModuleCard";
import type { Difficulty, ProjectStatus } from "../types";

function getDifficultyClass(d: Difficulty): string {
  if (d === "Beginner") return "badge-beginner";
  if (d === "Intermediate") return "badge-intermediate";
  return "badge-advanced";
}

function getStatusColor(s: ProjectStatus): string {
  if (s === "planning") return "text-primary";
  if (s === "in_progress") return "text-secondary";
  return "text-accent";
}

function getStatusDot(s: ProjectStatus): string {
  if (s === "planning") return "bg-primary";
  if (s === "in_progress") return "bg-secondary";
  return "bg-accent";
}

export function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const { data: project, isLoading, isError, error } = useQuery({
    queryKey: ["project", id],
    queryFn: () => getProject(id!),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteProject(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      navigate("/");
    },
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <button className="btn-ghost mb-6 text-sm" onClick={() => navigate(-1)}>
        ← Back to Dashboard
      </button>

      {isLoading && <LoadingSpinner />}

      {isError && (
        <div className="glass-card p-6">
          <p className="text-destructive font-semibold">Failed to load project</p>
          <p className="text-secondary-custom text-sm mt-1">
            {(error as Error).message}
          </p>
        </div>
      )}

      {project && (
        <>
          <div className="hero-banner p-8 mb-8 animate-fade-in-up relative">
            {/* Delete button top-right */}
            <div className="absolute top-4 right-4">
              {!confirmingDelete ? (
                <button
                  className="flex items-center gap-1.5 text-sm text-destructive hover:text-destructive/80 transition-colors"
                  onClick={() => setConfirmingDelete(true)}
                >
                  <Trash2 size={16} />
                  Delete Project
                </button>
              ) : (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-foreground">Are you sure?</span>
                  <button
                    className="px-3 py-1 rounded bg-destructive text-destructive-foreground text-xs font-medium disabled:opacity-50"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate()}
                  >
                    {deleteMutation.isPending ? "Deleting…" : "Delete"}
                  </button>
                  <button
                    className="px-3 py-1 rounded bg-muted text-muted-foreground text-xs font-medium"
                    onClick={() => setConfirmingDelete(false)}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {deleteMutation.isError && (
              <p className="text-destructive text-xs mb-2">
                {(deleteMutation.error as Error).message}
              </p>
            )}

            <h1 className="text-3xl font-extrabold text-foreground mb-2">
              {project.title}
            </h1>
            <p className="text-secondary-custom mb-4 max-w-2xl">
              {project.description}
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="badge badge-stack">{project.targetStack}</span>
              <span className={`badge ${getDifficultyClass(project.difficulty)}`}>
                {project.difficulty}
              </span>
              <span className={`badge flex items-center gap-1.5 ${getStatusColor(project.status)}`}>
                <span
                  className={`w-2 h-2 rounded-full ${getStatusDot(project.status)}`}
                  style={
                    project.status === "in_progress"
                      ? { animation: "pulse-dot 2s ease-in-out infinite" }
                      : undefined
                  }
                />
                {project.status.replace("_", " ")}
              </span>
            </div>
            <p className="text-muted-custom text-xs mt-4">
              Created {new Date(project.createdAt).toLocaleDateString()}
            </p>
          </div>

          <h2 className="text-xl font-bold text-foreground mb-4">
            Your Learning Modules
          </h2>

          {project.modules.length === 0 ? (
            <p className="text-secondary-custom">No modules generated yet.</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {project.modules.map((m) => (
                <ModuleCard key={m.moduleId} module={m} projectId={project.projectId} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
