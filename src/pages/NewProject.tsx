import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createProject } from "../api/client";
import type { Difficulty } from "../types";

const STACK_OPTIONS = [
  "Node + TS + Postgres + React",
  "Python + FastAPI + React",
  "Node + TS + MongoDB + React",
];

const DIFFICULTY_OPTIONS: Difficulty[] = ["Beginner", "Intermediate", "Advanced"];

export function NewProject() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetStack, setTargetStack] = useState(STACK_OPTIONS[0]);
  const [difficulty, setDifficulty] = useState<Difficulty>("Beginner");

  const mutation = useMutation({
    mutationFn: createProject,
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      navigate(`/projects/${project.projectId}`);
    },
  });

  const canSubmit = title.trim() !== "" && description.trim() !== "";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    mutation.mutate({ title, description, targetStack, difficulty });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <button className="btn-ghost mb-6 text-sm" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div className="glass-card p-8">
        <h1 className="text-2xl font-extrabold text-foreground mb-1">
          New Learning Project
        </h1>
        <p className="text-secondary-custom text-sm mb-6">
          Describe what you want to build and we'll plan your learning path.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="form-label" htmlFor="title">Title</label>
            <input
              id="title"
              className="form-input"
              type="text"
              placeholder="Build a Bouquet REST API"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label" htmlFor="desc">Description</label>
            <textarea
              id="desc"
              className="form-input resize-none"
              rows={4}
              placeholder="Describe what you want to build and what you want to learn…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label" htmlFor="stack">Target Stack</label>
            <select
              id="stack"
              className="form-input"
              value={targetStack}
              onChange={(e) => setTargetStack(e.target.value)}
            >
              {STACK_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" htmlFor="diff">Difficulty</label>
            <select
              id="diff"
              className="form-input"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            >
              {DIFFICULTY_OPTIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {mutation.isError && (
            <div className="p-3 rounded-lg text-sm text-destructive" style={{ background: "rgba(244,63,94,0.1)" }}>
              {(mutation.error as Error).message}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary w-full mt-2"
            disabled={!canSubmit || mutation.isPending}
          >
            {mutation.isPending ? "Creating…" : "Create Project"}
          </button>
        </form>
      </div>
    </div>
  );
}
