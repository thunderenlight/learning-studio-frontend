
-- Create objective_progress table
CREATE TABLE public.objective_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.modules ON DELETE CASCADE,
  objective_index integer NOT NULL,
  status text NOT NULL DEFAULT 'not_started',
  UNIQUE(user_id, module_id, objective_index)
);

ALTER TABLE public.objective_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their objective progress"
  ON public.objective_progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create chat_messages table
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.modules ON DELETE CASCADE,
  message text NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'system')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their chat messages"
  ON public.chat_messages FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime on chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Create sandbox_sessions table
CREATE TABLE public.sandbox_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.modules ON DELETE CASCADE,
  code text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, module_id)
);

ALTER TABLE public.sandbox_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their sandbox sessions"
  ON public.sandbox_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
