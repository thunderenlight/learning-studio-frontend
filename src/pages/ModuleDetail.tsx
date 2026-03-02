import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Circle, CircleDot, CheckCircle2, Send, Save } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import {
  getProject,
  getObjectiveProgress,
  upsertObjectiveProgress,
  getChatMessages,
  sendChatMessage,
  sendAiChatMessage,
  getSandboxSession,
  saveSandboxSession,
} from "@/api/client";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import type { ObjectiveStatus, ChatMessage, PlannedModule } from "@/types";

const STATUS_CYCLE: ObjectiveStatus[] = ["not_started", "in_progress", "completed"];

function nextStatus(current: ObjectiveStatus): ObjectiveStatus {
  const i = STATUS_CYCLE.indexOf(current);
  return STATUS_CYCLE[(i + 1) % STATUS_CYCLE.length];
}

function StatusIcon({ status }: { status: ObjectiveStatus }) {
  if (status === "completed") return <CheckCircle2 size={18} className="text-accent flex-shrink-0" />;
  if (status === "in_progress") return <CircleDot size={18} className="text-secondary flex-shrink-0" />;
  return <Circle size={18} className="text-muted-foreground flex-shrink-0" />;
}

export function ModuleDetail() {
  const { projectId, moduleId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [chatInput, setChatInput] = useState("");
  const [code, setCode] = useState("");
  const [codeLoaded, setCodeLoaded] = useState(false);
  const [isAiTyping, setIsAiTyping] = useState(false);

  // ── Queries ──
  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId!),
    enabled: !!projectId,
  });

  const progressQuery = useQuery({
    queryKey: ["objective-progress", moduleId],
    queryFn: () => getObjectiveProgress(moduleId!),
    enabled: !!moduleId,
  });

  const chatQuery = useQuery({
    queryKey: ["chat-messages", moduleId],
    queryFn: () => getChatMessages(moduleId!),
    enabled: !!moduleId,
  });

  const sandboxQuery = useQuery({
    queryKey: ["sandbox-session", moduleId],
    queryFn: () => getSandboxSession(moduleId!),
    enabled: !!moduleId,
  });

  // Load saved code once
  useEffect(() => {
    if (sandboxQuery.data && !codeLoaded) {
      setCode(sandboxQuery.data.code);
      setCodeLoaded(true);
    } else if (sandboxQuery.isFetched && !sandboxQuery.data && !codeLoaded) {
      setCodeLoaded(true);
    }
  }, [sandboxQuery.data, sandboxQuery.isFetched, codeLoaded]);

  // ── Realtime subscription for chat (dedup by id) ──
  useEffect(() => {
    if (!moduleId) return;
    const channel = supabase
      .channel(`chat-${moduleId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `module_id=eq.${moduleId}` },
        (payload) => {
          queryClient.setQueryData<ChatMessage[]>(
            ["chat-messages", moduleId],
            (old) => {
              const msg = payload.new as ChatMessage;
              if ((old ?? []).some((m) => m.id === msg.id)) return old ?? [];
              return [...(old ?? []), msg];
            }
          );
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [moduleId, queryClient]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatQuery.data, isAiTyping]);

  // ── Mutations ──
  const toggleObjective = useMutation({
    mutationFn: ({ index, newStatus }: { index: number; newStatus: ObjectiveStatus }) =>
      upsertObjectiveProgress(projectId!, moduleId!, index, newStatus),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["objective-progress", moduleId] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: ({ message, role }: { message: string; role: "user" | "system" | "assistant" }) =>
      sendChatMessage(projectId!, moduleId!, message, role),
    onMutate: async ({ message, role }) => {
      await queryClient.cancelQueries({ queryKey: ["chat-messages", moduleId] });
      const previous = queryClient.getQueryData<ChatMessage[]>(["chat-messages", moduleId]);
      const optimistic: ChatMessage = {
        id: crypto.randomUUID(),
        user_id: "",
        project_id: projectId!,
        module_id: moduleId!,
        message,
        role,
        created_at: new Date().toISOString(),
      };
      queryClient.setQueryData<ChatMessage[]>(
        ["chat-messages", moduleId],
        (old) => [...(old ?? []), optimistic]
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["chat-messages", moduleId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-messages", moduleId] });
    },
  });

  const saveCode = useMutation({
    mutationFn: (c: string) => saveSandboxSession(moduleId!, c),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["sandbox-session", moduleId] });
    },
  });

  // ── Derived data ──
  const mod: PlannedModule | undefined = projectQuery.data?.modules.find(
    (m) => m.moduleId === moduleId
  );

  const progressMap: Record<number, ObjectiveStatus> = {};
  (progressQuery.data ?? []).forEach((p) => {
    progressMap[p.objective_index] = p.status;
  });

  const completedCount = mod
    ? mod.objectives.filter((_, i) => progressMap[i] === "completed").length
    : 0;

  const messages: ChatMessage[] = chatQuery.data ?? [];

  if (projectQuery.isLoading) return <LoadingSpinner />;
  if (!mod) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <button className="btn-ghost mb-6 text-sm" onClick={() => navigate(-1)}>← Back</button>
        <div className="glass-card p-6">
          <p className="text-destructive font-semibold">Module not found</p>
        </div>
      </div>
    );
  }

  function handleObjectiveClick(index: number) {
    const current = progressMap[index] ?? "not_started";
    const ns = nextStatus(current);
    toggleObjective.mutate({ index, newStatus: ns });

    if (!mod) return;
    const obj = mod.objectives[index];
    const resourceLinks = (mod.resources ?? [])
      .map((r) => `${r.label}: ${r.url}`)
      .join("\n");
    const hint = mod.interactiveHint ? `\n💡 Hint: ${mod.interactiveHint}` : "";
    const lessonMsg = `📘 Lesson: ${obj}${resourceLinks ? `\n\n📎 Resources:\n${resourceLinks}` : ""}${hint}`;
    sendMessageMutation.mutate({ message: lessonMsg, role: "system" });
  }

  async function handleSendChat(e: React.FormEvent) {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text || !mod) return;
    setChatInput("");

    // Insert user message (optimistic)
    sendMessageMutation.mutate({ message: text, role: "user" });

    // Call AI
    setIsAiTyping(true);
    try {
      const { reply } = await sendAiChatMessage(
        projectId!,
        moduleId!,
        mod.title,
        mod.summary,
        mod.objectives,
        text
      );
      // Insert assistant reply
      sendMessageMutation.mutate({ message: reply, role: "assistant" });
    } catch {
      sendMessageMutation.mutate({ message: "⚠️ Could not get AI response. Please try again.", role: "system" });
    } finally {
      setIsAiTyping(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <button className="btn-ghost mb-4 text-sm" onClick={() => navigate(`/projects/${projectId}`)}>
        <span className="flex items-center gap-1"><ArrowLeft size={16} /> Back to Project</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left Pane: Lessons ── */}
        <div className="glass-card p-6 animate-fade-in-up flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground mb-1">{mod.title}</h1>
            <p className="text-secondary-custom text-sm mb-3">{mod.summary}</p>
            <div className="badge badge-stack">
              {completedCount}/{mod.objectives.length} complete
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="text-secondary-custom text-xs font-semibold uppercase tracking-wider">
              Objectives
            </p>
            {mod.objectives.map((obj, i) => {
              const st = progressMap[i] ?? "not_started";
              return (
                <button
                  key={i}
                  className="flex items-start gap-2.5 p-3 rounded-lg text-left transition-all hover:bg-muted/40"
                  style={{ background: st === "completed" ? "rgba(34,211,160,0.06)" : undefined }}
                  onClick={() => handleObjectiveClick(i)}
                >
                  <StatusIcon status={st} />
                  <span className={`text-sm ${st === "completed" ? "text-accent line-through" : "text-foreground"}`}>
                    {obj}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Deliverable */}
          <div className="build-box mt-auto">
            <p className="text-xs font-semibold uppercase tracking-wider text-secondary mb-1">Deliverable</p>
            <p className="text-sm text-foreground">{mod.deliverable}</p>
          </div>
        </div>

        {/* ── Right Pane: Chat | Sandbox ── */}
        <div className="glass-card animate-fade-in-up overflow-hidden flex flex-col" style={{ minHeight: "500px" }}>
          <Tabs defaultValue="chat" className="flex flex-col flex-1">
            <TabsList className="w-full rounded-none border-b border-border bg-transparent justify-start px-4 pt-2">
              <TabsTrigger value="chat" className="data-[state=active]:bg-muted/40">Chat</TabsTrigger>
              <TabsTrigger value="sandbox" className="data-[state=active]:bg-muted/40">Sandbox</TabsTrigger>
            </TabsList>

            {/* ── Chat Tab ── */}
            <TabsContent value="chat" className="flex-1 flex flex-col p-0 m-0">
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2" style={{ maxHeight: "400px" }}>
                {messages.length === 0 && !isAiTyping && (
                  <p className="text-muted-foreground text-sm text-center mt-10">No messages yet</p>
                )}
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded-lg px-3 py-2 text-sm max-w-[85%] whitespace-pre-wrap ${
                      msg.role === "assistant"
                        ? "bg-accent/10 text-foreground self-start"
                        : msg.role === "system"
                          ? "bg-muted/50 text-secondary-custom self-start"
                          : "bg-primary/20 text-foreground self-end"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="flex items-start gap-1.5">
                        <span className="flex-shrink-0">🤖</span>
                        <div className="prose prose-invert prose-sm max-w-none [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded [&_code]:font-mono [&_a]:text-primary [&_a]:underline">
                          <ReactMarkdown
                            components={{
                              a: ({ ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
                            }}
                          >
                            {msg.message}
                          </ReactMarkdown>
                        </div>
                      </div>
                    ) : msg.role === "system" ? (
                      <span>📘 {msg.message}</span>
                    ) : (
                      msg.message
                    )}
                  </div>
                ))}
                {isAiTyping && (
                  <div className="rounded-lg px-3 py-2 text-sm max-w-[85%] bg-accent/10 text-foreground self-start">
                    <span className="flex items-center gap-1.5">
                      🤖 <span className="animate-pulse">Thinking…</span>
                    </span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleSendChat} className="flex gap-2 p-3 border-t border-border">
                <input
                  className="form-input flex-1 text-sm"
                  placeholder="Type a message…"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                />
                <button type="submit" className="btn-primary p-2" disabled={sendMessageMutation.isPending || isAiTyping}>
                  <Send size={16} />
                </button>
              </form>
            </TabsContent>

            {/* ── Sandbox Tab ── */}
            <TabsContent value="sandbox" className="flex-1 flex flex-col p-0 m-0">
              <div className="flex-1 p-4 flex flex-col gap-3">
                {!codeLoaded ? (
                  <LoadingSpinner />
                ) : (
                  <>
                    <textarea
                      className="flex-1 w-full font-mono text-sm p-4 rounded-lg border border-border bg-background text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
                      style={{ minHeight: "300px" }}
                      placeholder="// Start coding here…"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-xs">
                        {sandboxQuery.data ? `Last saved ${new Date(sandboxQuery.data.updated_at).toLocaleString()}` : "No code saved yet"}
                      </span>
                      <button
                        className="btn-outline text-sm flex items-center gap-1.5"
                        onClick={() => saveCode.mutate(code)}
                        disabled={saveCode.isPending}
                      >
                        <Save size={14} />
                        {saveCode.isPending ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
