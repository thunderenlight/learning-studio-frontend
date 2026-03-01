import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { markModuleComplete, markModuleIncomplete } from "../api/client";
import type { PlannedModule, ModuleStatus } from "../types";

function getStripeColor(s: ModuleStatus): string {
  if (s === "not_started") return "hsl(228, 16%, 36%)";
  if (s === "in_progress") return "hsl(190, 100%, 50%)";
  return "hsl(163, 70%, 52%)";
}

function getStripeGlow(s: ModuleStatus): string | undefined {
  if (s === "in_progress") return "0 0 8px rgba(0,210,255,0.6)";
  return undefined;
}

function getStatusBadge(s: ModuleStatus) {
  const map: Record<ModuleStatus, { dot: string; text: string; label: string }> = {
    not_started: { dot: "bg-muted-foreground", text: "text-muted-foreground", label: "Not Started" },
    in_progress: { dot: "bg-secondary", text: "text-secondary", label: "In Progress" },
    completed: { dot: "bg-accent", text: "text-accent", label: "Completed" },
  };
  return map[s];
}

export function ModuleCard({ module, projectId }: { module: PlannedModule; projectId: string }) {
  const navigate = useNavigate();
  const status = getStatusBadge(module.status);
  const queryClient = useQueryClient();

  const completeMutation = useMutation({
    mutationFn: () => markModuleComplete(module.moduleId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["project", projectId] });
      queryClient.setQueryData(["project", projectId], (old: unknown) => {
        if (!old) return old;
        const proj = old as { modules: PlannedModule[] };
        return {
          ...proj,
          modules: proj.modules.map((m: PlannedModule) =>
            m.moduleId === module.moduleId ? { ...m, status: "completed" as ModuleStatus } : m
          ),
        };
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });

  const incompleteMutation = useMutation({
    mutationFn: () => markModuleIncomplete(module.moduleId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["project", projectId] });
      queryClient.setQueryData(["project", projectId], (old: unknown) => {
        if (!old) return old;
        const proj = old as { modules: PlannedModule[] };
        return {
          ...proj,
          modules: proj.modules.map((m: PlannedModule) =>
            m.moduleId === module.moduleId ? { ...m, status: "not_started" as ModuleStatus } : m
          ),
        };
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });

  const isCompleted = module.status === "completed";

  return (
    <div
      className="glass-card animate-fade-in-up flex overflow-hidden cursor-pointer transition-all hover:ring-1 hover:ring-primary/30"
      onClick={() => navigate(`/projects/${projectId}/modules/${module.moduleId}`)}
    >
      {/* Left stripe */}
      <div
        className="w-1 flex-shrink-0 rounded-l-lg"
        style={{
          backgroundColor: getStripeColor(module.status),
          boxShadow: getStripeGlow(module.status),
        }}
      />

      <div className="p-5 flex flex-col gap-3 flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary"
            style={{
              background: "rgba(108,99,255,0.2)",
              border: "1px solid rgba(108,99,255,0.4)",
            }}
          >
            {module.order}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-foreground leading-tight">
              {module.title}
            </h4>
            <span className={`badge mt-1 ${status.text}`}>
              <span
                className={`w-2 h-2 rounded-full ${status.dot}`}
                style={
                  module.status === "in_progress"
                    ? { animation: "pulse-dot 2s ease-in-out infinite" }
                    : undefined
                }
              />
              {isCompleted && <span className="mr-0.5">✓</span>}
              {status.label}
            </span>
          </div>
          <ChevronRight size={18} className="text-muted-foreground flex-shrink-0 mt-1" />
        </div>

        {/* Summary */}
        <p className="text-secondary-custom text-sm">{module.summary}</p>

        {/* Objectives */}
        {module.objectives.length > 0 && (
          <div>
            <p className="text-secondary-custom text-xs font-semibold uppercase tracking-wider mb-1">
              What you will learn
            </p>
            <ul className="list-disc list-inside text-sm text-foreground space-y-0.5">
              {module.objectives.map((obj, i) => (
                <li key={i}>{obj}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Deliverable */}
        <div className="build-box">
          <p className="text-xs font-semibold uppercase tracking-wider text-secondary mb-1">
            What you will build
          </p>
          <p className="text-sm text-foreground">{module.deliverable}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-secondary-custom mt-auto pt-1">
          <span className="flex items-center gap-1">
            🕐 {module.estimated_hours}h estimated
          </span>
          {module.gitRepoUrl && (
            <a
              href={module.gitRepoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary hover:underline"
            >
              Open repo ↗
            </a>
          )}
        </div>

        {/* Progress button */}
        <button
          className={isCompleted ? "btn-ghost text-sm text-accent" : "btn-outline text-sm"}
          onClick={(e) => {
            e.stopPropagation();
            isCompleted ? incompleteMutation.mutate() : completeMutation.mutate();
          }}
          disabled={completeMutation.isPending || incompleteMutation.isPending}
        >
          {isCompleted ? "✓ Completed — Undo" : "Mark Complete"}
        </button>
      </div>
    </div>
  );
}
