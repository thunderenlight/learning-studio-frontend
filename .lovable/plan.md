

## What's Already Done (No Changes Needed)

- **Auth system**: `src/pages/Login.tsx`, `src/hooks/useAuth.tsx`, `src/components/ProtectedRoute.tsx` all exist and work. The navbar has a Sign Out button. Protected routes redirect to `/login`.
- **API client**: `src/api/client.ts` already uses Supabase directly for `listProjects`, `getProject`, and has `deleteProject`. `createProject` still calls the Cloudflare Worker. No `DEMO_USER_ID` references remain.

## What Needs to Be Built

### 1. Delete button on ProjectCard (`src/components/ProjectCard.tsx`)

- Import `Trash2` from `lucide-react`, `useMutation`/`useQueryClient` from React Query, and `deleteProject` from the API client
- Add a `useState` for `confirmingDelete` and `deleteError`
- Render a `Trash2` icon button in the top-right corner of the card, visible only on hover (using `group` + `opacity-0 group-hover:opacity-100`)
- When clicked (with `e.stopPropagation()`), toggle `confirmingDelete` state to show an inline confirmation row with red "Delete" and grey "Cancel" buttons
- On confirm: call `deleteProject(project.projectId)` via mutation, then invalidate `["projects"]` query
- Show loading state on the Delete button while pending; show error text if it fails

### 2. Delete button on ProjectDetail (`src/pages/ProjectDetail.tsx`)

- Import `useMutation`/`useQueryClient`, `deleteProject`, and `Trash2`
- Add a `useState` for `confirmingDelete`
- In the hero banner, add a red "Delete Project" button (positioned top-right using flex `justify-between` or absolute positioning)
- Same confirmation pattern: inline "Are you sure?" with red Delete and grey Cancel buttons
- On success: navigate to `/` and invalidate `["projects"]` query

### 3. Progress bar on ProjectCard (`src/components/ProjectCard.tsx`)

- Import the existing `Progress` component from `src/components/ui/progress.tsx`
- Calculate `percentage = project.moduleCount > 0 ? Math.round((project.completedModules / project.moduleCount) * 100) : 0`
- Render a `Progress` bar below the "X modules - Y completed" text, with a percentage label
- Style the progress bar to match the dark theme (override the default bg-secondary/bg-primary classes)

### Technical Details

**Files modified:**
- `src/components/ProjectCard.tsx` -- add delete button with confirmation + progress bar
- `src/pages/ProjectDetail.tsx` -- add delete button with confirmation in hero banner

**No new files created. No database changes needed.** The `deleteProject` function already exists in `src/api/client.ts` and RLS policies already allow users to delete their own projects.

