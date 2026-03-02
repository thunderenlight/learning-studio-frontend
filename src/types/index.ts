export type Difficulty = "Beginner" | "Intermediate" | "Advanced";
export type ModuleStatus = "not_started" | "in_progress" | "completed";
export type ProjectStatus = "planning" | "in_progress" | "completed";

export interface ProjectRequest {
  userId: string;
  title: string;
  description: string;
  targetStack: string;
  difficulty: Difficulty;
}

export interface PlannedModule {
  moduleId: string;
  order: number;
  title: string;
  summary: string;
  objectives: string[];
  deliverable: string;
  estimated_hours: number;
  status: ModuleStatus;
  gitRepoUrl: string | null;
  starterCodeUrl: string | null;
  interactiveHint: string | null;
  resources: ModuleResource[];
}

export interface LearningProject {
  projectId: string;
  userId: string;
  title: string;
  description: string;
  targetStack: string;
  difficulty: Difficulty;
  status: ProjectStatus;
  createdAt: string;
  modules: PlannedModule[];
}

export interface ProjectSummary {
  projectId: string;
  title: string;
  targetStack: string;
  difficulty: Difficulty;
  status: ProjectStatus;
  moduleCount: number;
  completedModules: number;
  createdAt: string;
}

export interface ListProjectsResponse {
  userId: string;
  projects: ProjectSummary[];
}

export interface ApiError {
  error: string;
  message: string;
  field?: string;
}

export type ObjectiveStatus = "not_started" | "in_progress" | "completed";

export interface ObjectiveProgress {
  id: string;
  user_id: string;
  project_id: string;
  module_id: string;
  objective_index: number;
  status: ObjectiveStatus;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  project_id: string;
  module_id: string;
  message: string;
  role: "user" | "system" | "assistant";
  created_at: string;
}

export interface SandboxSession {
  id: string;
  user_id: string;
  module_id: string;
  code: string;
  updated_at: string;
}

export interface ModuleResource {
  id: string;
  label: string;
  url: string;
  type: string;
}
