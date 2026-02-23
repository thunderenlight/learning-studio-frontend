import { useNavigate } from "react-router-dom";
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

  return (
    <div
      className="glass-card hover-card p-6 flex flex-col gap-3 animate-fade-in-up cursor-pointer"
      onClick={() => navigate(`/projects/${project.projectId}`)}
    >
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
