import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { deleteProject } from "../api/client";
import { Progress } from "./ui/progress";
import type { ProjectSummary, Difficulty, ProjectStatus } from "../types";

function getDifficultyClass(d: Difficulty): string {
  if (d === "Beginner") return "badge-beginner";
  if (d === "Intermediate") return "badge-intermediate";
  return "badge-advanced";
}

function getStatusDot(s: ProjectStatus): string {
  if (s === "planning") return "bg-primary";
  if (s === "in_progress") return "bg-secondary";
  return "bg-accent";
}

function getStatusColor(s: ProjectStatus): string {
  if (s === "planning") return "text-primary";
  if (s === "in_progress") return "text-secondary";
  return "text-accent";
}

export function ProjectCard({ project }: { project: ProjectSummary }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: () => deleteProject(project.projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (err: Error) => {
      setDeleteError(err.message);
    },
  });

  const percentage =
    project.moduleCount > 0
      ? Math.round((project.completedModules / project.moduleCount) * 100)
      : 0;

  return (
    <div
      className="glass-card hover-card p-6 flex flex-col gap-3 animate-fade-in-up cursor-pointer group relative"
      onClick={() => navigate(`/projects/${project.projectId}`)}
    >
      {/* Delete icon — visible on hover */}
      {!confirmingDelete && (
        <button
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            setConfirmingDelete(true);
            setDeleteError(null);
          }}
          aria-label="Delete project"
        >
          <Trash2 size={16} />
        </button>
      )}

      {/* Inline delete confirmation */}
      {confirmingDelete && (
        <div
          className="flex items-center gap-2 text-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-foreground">Delete?</span>
          <button
            className="px-2 py-1 rounded bg-destructive text-destructive-foreground text-xs font-medium disabled:opacity-50"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate()}
          >
            {deleteMutation.isPending ? "Deleting…" : "Delete"}
          </button>
          <button
            className="px-2 py-1 rounded bg-muted text-muted-foreground text-xs font-medium"
            onClick={() => setConfirmingDelete(false)}
          >
            Cancel
          </button>
        </div>
      )}

      {deleteError && (
        <p className="text-destructive text-xs">{deleteError}</p>
      )}

      <h3 className="text-lg font-bold text-foreground leading-tight">
        {project.title}
      </h3>
      <p className="text-secondary-custom text-sm">{project.targetStack}</p>

      <div className="flex flex-wrap gap-2">
        <span className={`badge ${getDifficultyClass(project.difficulty)}`}>
          {project.difficulty}
        </span>
        <span className={`badge flex items-center gap-1.5 ${getStatusColor(project.status)}`}>
          <span
            className={`w-2 h-2 rounded-full ${getStatusDot(project.status)} ${
              project.status === "in_progress" ? "animate-pulse" : ""
            }`}
            style={
              project.status === "in_progress"
                ? { animation: "pulse-dot 2s ease-in-out infinite" }
                : undefined
            }
          />
          {project.status.replace("_", " ")}
        </span>
      </div>

      <p className="text-secondary-custom text-sm">
        {project.moduleCount} modules · {project.completedModules} completed
      </p>

      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <Progress
          value={percentage}
          className="h-2 flex-1 bg-muted"
        />
        <span className="text-xs text-muted-foreground">{percentage}%</span>
      </div>

      <p className="text-muted-custom text-xs mt-auto">
        {new Date(project.createdAt).toLocaleDateString()}
      </p>

      <button
        className="btn-outline text-sm mt-1 w-full"
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/projects/${project.projectId}`);
        }}
      >
        View Project →
      </button>
    </div>
  );
}
