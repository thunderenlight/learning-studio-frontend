## Overview

This plan adds a Module Detail page with a two-pane layout (Lessons + Chat/Sandbox), shows user email in the nav, improves auth error handling, and makes module cards clickable. Two new Supabase tables and schema changes are required.

---

## Part A: Auth UX Cleanup

### 1. Show user email in Navbar (`src/App.tsx`)

- Display `user.email` as a truncated text span next to the Sign Out button in the Navbar component.

### 2. ErrorBanner component (`src/components/ErrorBanner.tsx`)

- A small reusable component that takes `message: string | null` and renders an inline error with the existing destructive styling (red text on `rgba(244,63,94,0.1)` background).
- Use it in `src/pages/Login.tsx` to replace the current inline error `<div>`.

---

## Part B: Module Detail Route + Clickable Cards

### 1. New route in `src/App.tsx`

- Add: `/projects/:projectId/modules/:moduleId` pointing to a new `ModuleDetail` page, wrapped in `<ProtectedRoute>`.

### 2. Make ModuleCard clickable (`src/components/ModuleCard.tsx`)

- Wrap the card in a clickable container using `useNavigate` to go to `/projects/${projectId}/modules/${module.moduleId}`.
- Add a subtle arrow icon (`ChevronRight` from lucide-react) in the header area as an "Open" affordance.
- Keep existing layout, buttons, and Mark Complete functionality unchanged. Use `e.stopPropagation()` on interactive elements.

---

## Part C: Module Detail Page

### New file: `src/pages/ModuleDetail.tsx`

A two-pane layout using CSS grid (`grid-cols-1 lg:grid-cols-2`).

**Left Pane -- Lessons:**

- Module title, summary, overall progress counter ("3/5 complete").
- Each objective rendered as a clickable lesson item with a status toggle cycling through: not_started -> in_progress -> completed.
- Clicking an objective sends a formatted "lesson message" into the Chat pane (includes objective text, any resources/links from the module data).
- Status per objective persisted to `objective_progress` table (see DB section).

**Right Pane -- Tabs (Chat | Sandbox):**

- Uses the existing `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` UI components.

**Chat tab:**

- Displays messages from `chat_messages` table filtered by module_id + user_id.
- Message input at bottom for user free-text messages.
- "Lesson messages" from objective clicks render as system-role messages.
- Subscribes to Supabase Realtime on `chat_messages` filtered by module_id for live updates.
- Empty state: "No messages yet".

**Sandbox tab:**

- Simple `<textarea>` styled as a code editor (monospace font, dark background) since Sandpack is not installed and we avoid adding heavy deps.
- Loads last saved code from `sandbox_sessions` on mount.
- "Save" button persists code snapshot to `sandbox_sessions` via upsert.
- Empty state: "No code saved yet" with a prompt to start typing.

### New API functions in `src/api/client.ts`

- `getObjectiveProgress(moduleId)` -- fetch from `objective_progress`
- `upsertObjectiveProgress(userId, projectId, moduleId, objectiveIndex, status)` -- upsert to `objective_progress`
- `getChatMessages(moduleId)` -- fetch from `chat_messages` ordered by created_at
- `sendChatMessage(userId, projectId, moduleId, message, role)` -- insert into `chat_messages`
- `getSandboxSession(moduleId)` -- fetch from `sandbox_sessions`
- `saveSandboxSession(userId, moduleId, code)` -- upsert to `sandbox_sessions`

### New types in `src/types/index.ts`

- `ObjectiveStatus` type alias (same as ModuleStatus)
- `ChatMessage` interface: `{ id, userId, projectId, moduleId, message, role, createdAt }`
- `SandboxSession` interface: `{ userId, moduleId, code, updatedAt }`

---

## Part D: Database Migrations

### Migration 1: Create `objective_progress` table

A new table (separate from existing `module_progress` which tracks module-level completion) to track per-objective status:

```text
objective_progress
  id          uuid PK default gen_random_uuid()
  user_id     uuid NOT NULL references auth.users
  project_id  uuid NOT NULL references projects on delete cascade
  module_id   uuid NOT NULL references modules on delete cascade
  objective_index integer NOT NULL
  status      text default 'not_started'
  unique(user_id, module_id, objective_index)
```

RLS: `auth.uid() = user_id`

### Migration 2: Create `chat_messages` table

```text
chat_messages
  id          uuid PK default gen_random_uuid()
  user_id     uuid NOT NULL references auth.users
  project_id  uuid NOT NULL references projects on delete cascade
  module_id   uuid NOT NULL references modules on delete cascade
  message     text NOT NULL
  role        text NOT NULL check (role in ('user','system'))
  created_at  timestamptz default now()
```

RLS: `auth.uid() = user_id`

Enable Realtime on this table.

### Migration 3: Create `sandbox_sessions` table

```text
sandbox_sessions
  id          uuid PK default gen_random_uuid()
  user_id     uuid NOT NULL references auth.users
  module_id   uuid NOT NULL references modules on delete cascade
  code        text NOT NULL default ''
  updated_at  timestamptz default now()
  unique(user_id, module_id)
```

RLS: `auth.uid() = user_id`

---

## Files Changed


| File                             | Action                                                 |
| -------------------------------- | ------------------------------------------------------ |
| `src/App.tsx`                    | Add module detail route, show user email in nav        |
| `src/components/ErrorBanner.tsx` | New -- reusable error banner                           |
| `src/pages/Login.tsx`            | Use ErrorBanner component                              |
| `src/components/ModuleCard.tsx`  | Add click-to-navigate + arrow icon                     |
| `src/pages/ModuleDetail.tsx`     | New -- two-pane lesson + chat/sandbox page             |
| `src/types/index.ts`             | Add ChatMessage, SandboxSession, ObjectiveStatus types |
| `src/api/client.ts`              | Add objective progress, chat, sandbox CRUD functions   |
| Supabase migration               | Create 3 new tables with RLS                           |


## Constraints Honored

- No changes to Dashboard or NewProject pages
- Existing dark theme and Tailwind styling preserved
- No service role key in frontend
- No heavy new dependencies (textarea for sandbox editor)
- Existing module_progress table and Mark Complete flow untouched  
  
In src/api/client.ts, user_id for all write operations must be read from supabase.auth.getUser() inside the function, not passed as a parameter from the component.  
A*lso fix the Dashboard progress bar so it reads completion % from* `module_progress` *rows for* `auth.uid()` *and recomputes when a module is marked complete.*