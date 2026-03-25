CREATE TABLE public.training_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  volunteer_name text NOT NULL,
  team_name text NOT NULL,
  phone text,
  registered_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.training_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leaders can insert training_checkins"
ON public.training_checkins
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'leader'::user_role));

CREATE POLICY "Leaders can view training_checkins"
ON public.training_checkins
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'leader'::user_role));