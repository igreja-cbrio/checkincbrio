-- Enable pgvector extension for facial descriptor similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Add face_descriptor column to profiles (users with accounts)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS face_descriptor vector(128);

-- Add face_descriptor column to volunteer_qrcodes (PC volunteers without accounts)
ALTER TABLE volunteer_qrcodes 
ADD COLUMN IF NOT EXISTS face_descriptor vector(128);

-- Create storage bucket for face photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('face-photos', 'face-photos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: Leaders can upload face photos
CREATE POLICY "Leaders can upload face photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'face-photos' AND has_role(auth.uid(), 'leader'::user_role));

-- RLS: Leaders can update face photos
CREATE POLICY "Leaders can update face photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'face-photos' AND has_role(auth.uid(), 'leader'::user_role));

-- RLS: Leaders can delete face photos
CREATE POLICY "Leaders can delete face photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'face-photos' AND has_role(auth.uid(), 'leader'::user_role));

-- RLS: Public can view face photos
CREATE POLICY "Public can view face photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'face-photos');

-- Create function to find face match using vector similarity
CREATE OR REPLACE FUNCTION find_face_match(
  query_descriptor vector(128),
  match_threshold float DEFAULT 0.6
)
RETURNS TABLE (
  volunteer_id uuid,
  volunteer_name text,
  planning_center_id text,
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
    'volunteer_qrcode'::text as source,
    (v.face_descriptor <-> query_descriptor)::float as distance
  FROM volunteer_qrcodes v
  WHERE v.face_descriptor IS NOT NULL
    AND (v.face_descriptor <-> query_descriptor) < match_threshold
  
  ORDER BY distance
  LIMIT 1;
END;
$$;

-- Create index for faster vector similarity search
CREATE INDEX IF NOT EXISTS idx_profiles_face_descriptor 
ON profiles USING ivfflat (face_descriptor vector_cosine_ops)
WHERE face_descriptor IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_volunteer_qrcodes_face_descriptor 
ON volunteer_qrcodes USING ivfflat (face_descriptor vector_cosine_ops)
WHERE face_descriptor IS NOT NULL;