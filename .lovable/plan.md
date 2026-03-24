## Overview

Fix tab heading readability, improve markdown code block styling, and replace the textarea sandbox with a full Sandpack editor via a new `SandboxPanel` component.

---

## 1. Tab heading contrast (`src/pages/ModuleDetail.tsx`)

Update the `TabsTrigger` elements (lines 292-293) to add `text-lg font-semibold` classes so "Chat" and "Sandbox" are visually prominent.

## 2. Markdown code block styling (`src/pages/ModuleDetail.tsx`)

Enhance the prose wrapper (line 316) with additional Tailwind arbitrary selectors:

```
[&_pre]:bg-[#1e1e2e] [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-2
[&_code]:bg-[#1e1e2e] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-accent [&_code]:text-xs
[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-foreground
```

This gives inline `code` a distinct dark pill background and code blocks a padded dark container, with `pre > code` reset so it doesn't double-style.

## 3. New component: `src/components/SandboxPanel.tsx`

### Props

```typescript
interface SandboxPanelProps {
  moduleId: string;
  projectId: string;
  moduleTitle: string;
  moduleSummary: string;
  objectives: string[];
  starterCode: string | null;
  targetStack: string;
  onAskAi: (code: string) => void; // switches to chat tab & auto-sends
}
```

### Dependencies

Install `@codesandbox/sandpack-react` and `@codesandbox/sandpack-themes`.

### Template detection

- `targetStack` includes "Python" → show "Python sandbox coming soon" message + plain textarea fallback
- `targetStack` includes "Vue" → `"vue-ts"` template
- Default → `"react-ts"` template

### Editor setup

- `<SandpackProvider>` + `<SandpackLayout>` with `<SandpackCodeEditor>` and `<SandpackPreview>`
- Theme: `sandpackDark` from `@codesandbox/sandpack-themes`
- Height: 500px
- Show file tabs via `showTabs` prop
- Pre-load with `starterCode` if present (mapped into `customSetup.files`), otherwise default hello-world

### Save & Restore

- On mount, query `sandbox_sessions` for this module+user. If exists, load that code instead of starter.
- Use `useActiveCode()` hook from Sandpack to get current code.
- Debounce code changes (3s) and upsert to `sandbox_sessions` via `saveSandboxSession`.
- Show a small green "Auto-saved ✓" badge that fades after 2 seconds using a `useState` + `setTimeout`.

### Reset button

- Top-right "Reset to starter" button.
- On click: confirm dialog ("This will clear your saved code. Continue?").
- On confirm: reset Sandpack files to starter code, delete the `sandbox_sessions` row for this module+user (new `deleteSandboxSession` function in `src/api/client.ts`).

### Ask AI button

- "Ask AI about this code" button next to Reset.
- On click: grab current code from `useActiveCode()`, call `onAskAi(code)` prop.
- Parent (`ModuleDetail`) handles: switch active tab to "chat", build message `"Review this code and tell me what to improve:\n\n```\n${code}\n```"`, and auto-send it (same flow as objective click).

## 4. Wire into ModuleDetail (`src/pages/ModuleDetail.tsx`)

- Convert `Tabs` to controlled mode with `useState<string>("chat")` for `activeTab`.
- Replace the entire Sandbox `TabsContent` (lines 356-385) with `<SandboxPanel>`.
- Pass `onAskAi` callback that sets `activeTab` to "chat", inserts the code review message, and triggers AI response.
- Remove `code`, `codeLoaded`, `sandboxQuery`, and `saveCode` state/queries from ModuleDetail (moved into SandboxPanel).

## 5. New API function (`src/api/client.ts`)

Add `deleteSandboxSession(moduleId: string)` that deletes the user's sandbox session row:

```typescript
export async function deleteSandboxSession(moduleId: string): Promise<void> {
  const userId = await getUserId();
  const { error } = await supabase
    .from("sandbox_sessions")
    .delete()
    .eq("user_id", userId)
    .eq("module_id", moduleId);
  if (error) throw new Error(error.message);
}
```

## Files Changed


| File                              | Changes                                                                                        |
| --------------------------------- | ---------------------------------------------------------------------------------------------- |
| `package.json`                    | Add `@codesandbox/sandpack-react`, `@codesandbox/sandpack-themes`                              |
| `src/components/SandboxPanel.tsx` | New -- Sandpack editor with save/restore/reset/ask-AI                                          |
| `src/pages/ModuleDetail.tsx`      | Tab styling, markdown code blocks, controlled tabs, wire SandboxPanel, remove old sandbox code |
| `src/api/client.ts`               | Add `deleteSandboxSession`                                                                     |


## No changes to

- Dashboard, NewProject, Login pages
- Database schema (uses existing `sandbox_sessions` table)
- Dark theme styling

```
Approved — please also address these 3 things during implementation:

1. useActiveCode() hook placement: This hook must be called from INSIDE 
   the SandpackProvider, not in the same component that renders it. 
   Please ensure the debounce/save logic lives in a separate inner child 
   component (e.g. SandboxAutoSave) nested inside <SandpackProvider>, 
   otherwise it will throw a "must be used inside SandpackProvider" 
   runtime error.

2. Add the console panel: The SandpackLayout should include 
   <SandpackConsole /> as a third panel below the editor and preview 
   so learners can see runtime output and errors.

3. Starter code file format: When mapping starterCode into 
   customSetup.files, use the correct Sandpack format:
   { "/App.tsx": { code: starterCode } }
   not a plain string, otherwise the editor will load blank.
```