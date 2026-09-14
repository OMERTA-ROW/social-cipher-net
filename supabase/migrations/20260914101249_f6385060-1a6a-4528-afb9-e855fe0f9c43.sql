CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_step TEXT NOT NULL DEFAULT 'profile',
  completed_steps TEXT[] NOT NULL DEFAULT '{}',
  skipped_steps TEXT[] NOT NULL DEFAULT '{}',
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_progress TO authenticated;
GRANT ALL ON public.onboarding_progress TO service_role;

ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members manage their own onboarding progress" ON public.onboarding_progress;
CREATE POLICY "Members manage their own onboarding progress"
  ON public.onboarding_progress FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_onboarding_progress_updated_at ON public.onboarding_progress;
CREATE TRIGGER update_onboarding_progress_updated_at
  BEFORE UPDATE ON public.onboarding_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();