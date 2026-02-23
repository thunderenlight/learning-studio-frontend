import { API_BASE_URL, DEMO_USER_ID } from "../config";
import type {
  ProjectRequest,
  LearningProject,
  ListProjectsResponse,
} from "../types";

export async function createProject(
  payload: Omit<ProjectRequest, "userId">
): Promise<LearningProject> {
  const res = await fetch(`${API_BASE_URL}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: DEMO_USER_ID, ...payload }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }
  return res.json();
}

export async function listProjects(): Promise<ListProjectsResponse> {
  const res = await fetch(
    `${API_BASE_URL}/api/projects?userId=${DEMO_USER_ID}`
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }
  return res.json();
}

export async function getProject(id: string): Promise<LearningProject> {
  const res = await fetch(`${API_BASE_URL}/api/projects/${id}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }
  return res.json();
}
