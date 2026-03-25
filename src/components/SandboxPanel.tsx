import { useState, useEffect, useRef, useCallback } from "react";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
  SandpackConsole,
  useActiveCode,
  useSandpack,
} from "@codesandbox/sandpack-react";
import { sandpackDark } from "@codesandbox/sandpack-themes";
import { RotateCcw, Bot } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getSandboxSession, saveSandboxSession, deleteSandboxSession } from "@/api/client";

interface SandboxPanelProps {
  moduleId: string;
  projectId: string;
  moduleTitle: string;
  moduleSummary: string;
  objectives: string[];
  starterCode: string | null;
  targetStack: string;
  onAskAi: (code: string) => void;
}

function buildDefaultCode(moduleTitle: string, objectives: string[]): string {
  const firstObjective = objectives.length > 0 ? objectives[0] : "Complete the module";
  return `// Objective: ${firstObjective}\n// Write your solution below\n\nfunction solution() {\n  // TODO: implement this\n  console.log("Starting: ${moduleTitle}");\n}\n\nsolution();\n`;
}

function getTemplate(targetStack: string): "react-ts" | "vue-ts" | null {
  const lower = targetStack.toLowerCase();
  if (lower.includes("python")) return null;
  if (lower.includes("vue")) return "vue-ts";
  return "react-ts";
}

/** Inner component that uses Sandpack hooks (must be inside SandpackProvider) */
function SandboxAutoSave({
  moduleId,
  onSaveStatus,
}: {
  moduleId: string;
  onSaveStatus: (saved: boolean) => void;
}) {
  const { code } = useActiveCode();
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const prevCodeRef = useRef(code);

  useEffect(() => {
    if (code === prevCodeRef.current) return;
    prevCodeRef.current = code;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        await saveSandboxSession(moduleId, code);
        onSaveStatus(true);
        setTimeout(() => onSaveStatus(false), 2000);
      } catch {
        // silent
      }
    }, 3000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [code, moduleId, onSaveStatus]);

  return null;
}

/** Inner component to grab code for Ask AI */
function AskAiButton({ onAskAi }: { onAskAi: (code: string) => void }) {
  const { code } = useActiveCode();
  return (
    <button
      className="btn-outline text-sm flex items-center gap-1.5"
      onClick={() => onAskAi(code)}
    >
      <Bot size={14} /> Ask AI
    </button>
  );
}

/** Inner component for Reset */
function ResetButton({
  moduleId,
  starterCode,
}: {
  moduleId: string;
  starterCode: string;
}) {
  const { sandpack } = useSandpack();

  const handleReset = useCallback(async () => {
    if (!window.confirm("This will clear your saved code. Continue?")) return;
    try {
      await deleteSandboxSession(moduleId);
    } catch {
      // silent
    }
    sandpack.updateFile("/App.tsx", starterCode);
  }, [moduleId, starterCode, sandpack]);

  return (
    <button
      className="btn-outline text-sm flex items-center gap-1.5"
      onClick={handleReset}
    >
      <RotateCcw size={14} /> Reset
    </button>
  );
}

export function SandboxPanel({
  moduleId,
  projectId,
  moduleTitle,
  moduleSummary,
  objectives,
  starterCode,
  targetStack,
  onAskAi,
}: SandboxPanelProps) {
  const [autoSaved, setAutoSaved] = useState(false);
  const template = getTemplate(targetStack);

  const savedSession = useQuery({
    queryKey: ["sandbox-session", moduleId],
    queryFn: () => getSandboxSession(moduleId),
    enabled: !!moduleId,
  });

  // Python fallback
  if (template === null) {
    return (
      <div className="p-6 flex flex-col items-center justify-center gap-3 text-center" style={{ minHeight: 400 }}>
        <p className="text-lg font-semibold text-foreground">Python sandbox coming soon</p>
        <p className="text-sm text-muted-foreground">
          In-browser Python execution is not yet supported. Use your local editor for now.
        </p>
        <textarea
          className="w-full font-mono text-sm p-4 rounded-lg border border-border bg-background text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
          style={{ minHeight: 300 }}
          placeholder="# Paste your Python code here for reference…"
        />
      </div>
    );
  }

  if (savedSession.isLoading) {
    return (
      <div className="flex items-center justify-center p-10">
        <span className="text-muted-foreground text-sm">Loading sandbox…</span>
      </div>
    );
  }

  const initialCode = savedSession.data?.code || starterCode || DEFAULT_CODE;

  const files: Record<string, { code: string }> = {
    "/App.tsx": { code: initialCode },
  };

  return (
    <div className="flex flex-col h-full">
      <SandpackProvider
        template={template}
        theme={sandpackDark}
        files={files}
        options={{ activeFile: "/App.tsx" }}
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <div className="flex items-center gap-2">
            {autoSaved && (
              <span className="text-xs text-accent font-medium animate-fade-in-up">
                Auto-saved ✓
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <AskAiButton onAskAi={onAskAi} />
            <ResetButton moduleId={moduleId} starterCode={starterCode || DEFAULT_CODE} />
          </div>
        </div>

        {/* Editor + Preview + Console */}
        <SandpackLayout style={{ height: 500, borderRadius: 0, border: "none", background: "#0f0f14" }}>
          <SandpackCodeEditor showTabs style={{ height: "100%" }} />
          <SandpackPreview style={{ height: "100%", background: "#0f0f14" }} />
        </SandpackLayout>
        <div style={{ height: 150 }} className="border-t border-border">
          <SandpackConsole style={{ height: "100%" }} />
        </div>

        {/* Auto-save hook component */}
        <SandboxAutoSave moduleId={moduleId} onSaveStatus={setAutoSaved} />
      </SandpackProvider>
    </div>
  );
}
