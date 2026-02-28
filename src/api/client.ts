import { API_BASE_URL } from "../config";
import { supabase } from "@/integrations/supabase/client";
import type {
  ProjectRequest,
  LearningProject,
  ProjectSummary,
  ListProjectsResponse,
  PlannedModule,
} from "../types";

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

export async function createProject(
  payload: Omit<ProjectRequest, "userId">
): Promise<{ projectId: string }> {
  const userId = await getUserId();
  const { data: { session } } = await supabase.auth.getSession();

  const res = await fetch(`${API_BASE_URL}/api/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
    },
    body: JSON.stringify({ userId, ...payload }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }
  return res.json();
}

export async function listProjects(): Promise<ListProjectsResponse> {
  const userId = await getUserId();

  const { data, error } = await supabase
    .from("projects")
    .select("id, title, target_stack, difficulty, status, created_at, modules(id, status)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const projects: ProjectSummary[] = (data ?? []).map((p: Record<string, unknown>) => {
    const modules = (p.modules ?? []) as Array<{ id: string; status: string }>;
    return {
      projectId: p.id as string,
      title: p.title as string,
      targetStack: p.target_stack as string,
      difficulty: p.difficulty as ProjectSummary["difficulty"],
      status: p.status as ProjectSummary["status"],
      moduleCount: modules.length,
      completedModules: modules.filter((m) => m.status === "completed").length,
      createdAt: p.created_at as string,
    };
  });

  return { userId, projects };
}

export async function getProject(id: string): Promise<LearningProject> {
  const userId = await getUserId();

  const { data, error } = await supabase
    .from("projects")
    .select("*, modules(*, module_resources(*))")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Project not found");

  // Fetch progress for this user's modules
  const moduleIds = ((data.modules ?? []) as Array<{ id: string }>).map((m) => m.id);
  let progressMap: Record<string, string> = {};

  if (moduleIds.length > 0) {
    const { data: progressData } = await supabase
      .from("module_progress")
      .select("module_id, status")
      .eq("user_id", userId)
      .in("module_id", moduleIds);

    if (progressData) {
      progressMap = Object.fromEntries(
        progressData.map((p: { module_id: string; status: string }) => [p.module_id, p.status])
      );
    }
  }

  const modules: PlannedModule[] = ((data.modules ?? []) as Array<Record<string, unknown>>)
    .sort((a, b) => (a.order_index as number) - (b.order_index as number))
    .map((m) => ({
      moduleId: m.id as string,
      order: m.order_index as number,
      title: m.title as string,
      summary: m.summary as string,
      objectives: (m.objectives ?? []) as string[],
      deliverable: m.deliverable as string,
      estimated_hours: m.estimated_hours as number,
      status: (progressMap[m.id as string] ?? m.status ?? "not_started") as PlannedModule["status"],
      gitRepoUrl: (m.git_repo_url as string) ?? null,
      starterCodeUrl: (m.starter_code_url as string) ?? null,
      interactiveHint: (m.interactive_hint as string) ?? null,
      resources: ((m.module_resources ?? []) as Array<Record<string, unknown>>).map((r) => ({
        id: r.id as string,
        label: r.label as string,
        url: r.url as string,
        type: r.type as string,
      })),
    }));

  return {
    projectId: data.id as string,
    userId: data.user_id as string,
    title: data.title as string,
    description: data.description as string,
    targetStack: data.target_stack as string,
    difficulty: data.difficulty as LearningProject["difficulty"],
    status: data.status as LearningProject["status"],
    createdAt: data.created_at as string,
    modules,
  };
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function markModuleComplete(moduleId: string): Promise<void> {
  const userId = await getUserId();
  const { error } = await supabase.from("module_progress").upsert(
    {
      user_id: userId,
      module_id: moduleId,
      status: "completed",
      completed_at: new Date().toISOString(),
    },
    { onConflict: "user_id,module_id" }
  );
  if (error) throw new Error(error.message);
}

export async function markModuleIncomplete(moduleId: string): Promise<void> {
  const userId = await getUserId();
  const { error } = await supabase.from("module_progress").upsert(
    {
      user_id: userId,
      module_id: moduleId,
      status: "not_started",
      completed_at: null,
    },
    { onConflict: "user_id,module_id" }
  );
  if (error) throw new Error(error.message);
}
