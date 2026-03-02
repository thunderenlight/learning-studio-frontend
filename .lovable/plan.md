## Overview

Fix route params, switch interfaces to snake_case, add optimistic chat updates with Realtime deduplication, build an AI chat response flow via a new Supabase Edge Function, render assistant messages with react-markdown, and update the role constraint on `chat_messages`.  
  
Verify that the route param names in App.tsx exactly match the destructured names in useParams() in ModuleDetail.tsx. If useParams() uses project_id and module_id, the route must be /:project_id/modules/:module_id. If they already match, no change needed.  
  
The Cloudflare Worker backend (`learning-studio-backend`) also needs a new route `POST /api/chat`. Add it to the Worker's `src/index.ts` router. It should accept `{ projectId, moduleId, moduleTitle, moduleSummary, objectives, message }`, build a conversation array with a system prompt (coding tutor context) + the user message, call the LLM using the same pattern as `plannerAgent`, and return `{ reply: string }`. Include CORS headers consistent with the existing routes.

---

## Database Migration

Add `'assistant'` to the allowed roles on `chat_messages`:

```sql
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_role_check;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_role_check CHECK (role IN ('user', 'system', 'assistant'));
```

No other schema changes needed.

---

## Bug 1: Route param naming

`**src/App.tsx**` (line 50) -- No change needed. The route already uses `:projectId` and `:moduleId`, which matches `useParams()` in `ModuleDetail.tsx` line 33. These are already consistent.

`**src/components/ModuleCard.tsx**` (line 77) -- Already correct: `navigate(\`/projects/${projectId}/modules/${module.moduleId})`.

No changes required for Bug 1.

---

## Bug 2: Snake_case interfaces

### `src/types/index.ts`

Change `ChatMessage`, `ObjectiveProgress`, and `SandboxSession` to use snake_case keys matching Supabase column names:

```typescript
export interface ChatMessage {
  id: string;
  user_id: string;
  project_id: string;
  module_id: string;
  message: string;
  role: "user" | "system" | "assistant";
  created_at: string;
}

export interface ObjectiveProgress {
  id: string;
  user_id: string;
  project_id: string;
  module_id: string;
  objective_index: number;
  status: ObjectiveStatus;
}

export interface SandboxSession {
  id: string;
  user_id: string;
  module_id: string;
  code: string;
  updated_at: string;
}
```

### `src/api/client.ts`

Remove all `.map()` transformations for `getObjectiveProgress`, `getChatMessages`, and `getSandboxSession` -- return the raw Supabase data directly since the interfaces now match snake_case columns. Specifically:

- `getObjectiveProgress`: return `data ?? []` directly (cast as `ObjectiveProgress[]`)
- `getChatMessages`: return `data ?? []` directly (cast as `ChatMessage[]`), update role type to include `'assistant'`
- `getSandboxSession`: return `data` directly (cast as `SandboxSession | null`)

### `src/pages/ModuleDetail.tsx`

Update all property accesses to use snake_case:

- `p.objectiveIndex` becomes `p.objective_index`
- `msg.id`, `msg.role`, `msg.message` stay the same (already snake_case-compatible)
- `sandboxQuery.data.updatedAt` becomes `sandboxQuery.data.updated_at`
- `sendMessage` mutation role type updated to include `'assistant'`

---

## Bug 3: Chat messages only appear after refresh

### Optimistic update on `sendMessage` mutation

In `ModuleDetail.tsx`, update the `sendMessage` mutation:

- `**onMutate**`: Cancel queries for `['chat-messages', moduleId]`, snapshot previous data, append an optimistic message (with a temp UUID, current timestamp) to the cache.
- `**onError**`: Roll back to the snapshot.
- `**onSettled**`: Invalidate `['chat-messages', moduleId]`.

### Realtime subscription fix

Replace the `invalidateQueries` callback with a `setQueryData` call that appends `payload.new` only if not already in the cache (dedup by `id`):

```typescript
.on('postgres_changes', { event: 'INSERT', ... }, (payload) => {
  queryClient.setQueryData<ChatMessage[]>(
    ['chat-messages', moduleId],
    (old) => {
      const msg = payload.new as ChatMessage;
      if ((old ?? []).some(m => m.id === msg.id)) return old ?? [];
      return [...(old ?? []), msg];
    }
  );
})
```

---

## Bug 4: AI assistant responses

### New Edge Function: `supabase/functions/chat/index.ts`

A Supabase Edge Function that:

1. Validates the JWT using `getClaims()` (with `verify_jwt = false` in config)
2. Accepts POST body: `{ projectId, moduleId, moduleTitle, moduleSummary, objectives, message }`
3. Calls the Cloudflare Worker at `POST ${API_BASE_URL}/api/chat` (or uses the same LLM endpoint pattern), passing the module context and user message. Since the user mentioned "same pattern as the planner agent" and the Worker is at `API_BASE_URL`, we'll proxy through to it.
4. Alternatively (simpler): call the Cloudflare Worker directly from the frontend, same as `createProject` does.

**Simpler approach chosen**: Add a new function `sendAiChatMessage` in `src/api/client.ts` that calls `POST ${API_BASE_URL}/api/chat` directly from the frontend (same pattern as `createProject` which already calls the Worker). No edge function needed -- the Cloudflare Worker handles LLM calls.

### `src/api/client.ts` -- new function

```typescript
export async function sendAiChatMessage(
  projectId: string,
  moduleId: string,
  moduleTitle: string,
  moduleSummary: string,
  objectives: string[],
  message: string
): Promise<{ reply: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${API_BASE_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
    },
    body: JSON.stringify({ projectId, moduleId, moduleTitle, moduleSummary, objectives, message }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }
  return res.json();
}
```

### `src/pages/ModuleDetail.tsx` -- AI response flow

In `handleSendChat`:

1. Insert user message (optimistic update shows it immediately)
2. Set `isAiTyping = true` state
3. Call `sendAiChatMessage(...)` with module context
4. On success: insert the reply as an `'assistant'` message via `sendChatMessage`
5. On error: insert an error system message or show toast
6. Set `isAiTyping = false`

**Typing indicator**: While `isAiTyping` is true, render a "..." bubble at the bottom of the chat (left-aligned, with a pulsing animation).

### Assistant message styling

In the chat message rendering, add a third style branch for `role === 'assistant'`:

```tsx
msg.role === "assistant"
  ? "bg-accent/10 text-foreground self-start"
  : msg.role === "system"
    ? "bg-muted/50 text-secondary-custom self-start"
    : "bg-primary/20 text-foreground self-end"
```

Assistant messages get a `🤖` prefix icon. System messages keep `📘`.

### react-markdown for assistant messages

Install `react-markdown` (user explicitly requested it). For assistant role messages, render with:

```tsx
import ReactMarkdown from 'react-markdown';

// Inside message render:
{msg.role === "assistant" ? (
  <ReactMarkdown className="prose prose-invert prose-sm [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded [&_code]:font-mono [&_a]:text-primary [&_a]:underline"
    components={{
      a: ({ ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
    }}
  >
    {msg.message}
  </ReactMarkdown>
) : msg.message}
```

---

## `supabase/config.toml`

No edge function changes needed since we're calling the Cloudflare Worker directly.

---

## Files Changed


| File                         | Changes                                                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `src/types/index.ts`         | Snake_case interfaces, add `'assistant'` role                                                                                         |
| `src/api/client.ts`          | Remove mappers, return raw data; add `sendAiChatMessage`                                                                              |
| `src/pages/ModuleDetail.tsx` | Snake_case property access, optimistic updates, Realtime dedup, AI response flow, typing indicator, assistant styling, react-markdown |
| `package.json`               | Add `react-markdown` dependency                                                                                                       |
| Supabase migration           | Update role check constraint                                                                                                          |


## Dependencies

- Add `react-markdown` (user explicitly requested it for rendering assistant messages)

## Not Changed

- `src/App.tsx` -- route already correct
- `src/components/ModuleCard.tsx` -- navigate URL already correct
- Dashboard, NewProject, Login pages
- Sandbox save/restore behavior
- Existing dark theme styling  
