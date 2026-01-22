-- Drop existing function and recreate with avatar_url
DROP FUNCTION IF EXISTS find_face_match(vector, float);

CREATE OR REPLACE FUNCTION find_face_match(
  query_descriptor vector(128),
  match_threshold float DEFAULT 0.6
)
RETURNS TABLE (
  volunteer_id uuid,
  volunteer_name text,
  planning_center_id text,
  avatar_url text,
  source text,
  distance float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  -- Search in profiles
  SELECT 
    p.id as volunteer_id,
    p.full_name as volunteer_name,
    p.planning_center_id,
    p.avatar_url,
    'profile'::text as source,
    (p.face_descriptor <-> query_descriptor)::float as distance
  FROM profiles p
  WHERE p.face_descriptor IS NOT NULL
    AND (p.face_descriptor <-> query_descriptor) < match_threshold
  
  UNION ALL
  
  -- Search in volunteer_qrcodes
  SELECT 
    v.id as volunteer_id,
    v.volunteer_name,
    v.planning_center_person_id as planning_center_id,
    v.avatar_url,
    'volunteer_qrcode'::text as source,
    (v.face_descriptor <-> query_descriptor)::float as distance
  FROM volunteer_qrcodes v
  WHERE v.face_descriptor IS NOT NULL
    AND (v.face_descriptor <-> query_descriptor) < match_threshold
  
  ORDER BY distance
  LIMIT 1;
END;
$$;