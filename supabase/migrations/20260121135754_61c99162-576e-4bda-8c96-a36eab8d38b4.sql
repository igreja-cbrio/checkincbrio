-- Add unique constraints to prevent duplicate check-ins

-- For scheduled check-ins: one check-in per schedule
CREATE UNIQUE INDEX IF NOT EXISTS check_ins_schedule_unique 
ON check_ins(schedule_id) 
WHERE schedule_id IS NOT NULL AND is_unscheduled = false;

-- For unscheduled check-ins: one per volunteer per service per day
CREATE UNIQUE INDEX IF NOT EXISTS check_ins_unscheduled_unique
ON check_ins(volunteer_id, service_id) 
WHERE is_unscheduled = true AND volunteer_id IS NOT NULL AND service_id IS NOT NULL;

-- Improve has_role function with null validation
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN _user_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
    )
  END
$$;