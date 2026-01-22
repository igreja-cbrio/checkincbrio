-- Create function to save face descriptor for profiles
CREATE OR REPLACE FUNCTION public.save_profile_face_descriptor(
  profile_id uuid,
  descriptor real[],
  photo_url text DEFAULT NULL
)
RETURNS TABLE(id uuid, saved boolean, updated_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Validate descriptor length
  IF array_length(descriptor, 1) != 128 THEN
    RAISE EXCEPTION 'Descriptor must have exactly 128 dimensions, got %', array_length(descriptor, 1);
  END IF;

  RETURN QUERY
  UPDATE profiles p
  SET 
    face_descriptor = array_to_vector(descriptor, 128, true),
    avatar_url = COALESCE(photo_url, p.avatar_url),
    updated_at = now()
  WHERE p.id = profile_id
  RETURNING 
    p.id,
    (p.face_descriptor IS NOT NULL) as saved,
    p.updated_at;
END;
$$;

-- Create function to save face descriptor for volunteer_qrcodes
CREATE OR REPLACE FUNCTION public.save_volunteer_qrcode_face_descriptor(
  qrcode_id uuid,
  descriptor real[],
  photo_url text DEFAULT NULL
)
RETURNS TABLE(id uuid, volunteer_name text, saved boolean, updated_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Validate descriptor length
  IF array_length(descriptor, 1) != 128 THEN
    RAISE EXCEPTION 'Descriptor must have exactly 128 dimensions, got %', array_length(descriptor, 1);
  END IF;

  RETURN QUERY
  UPDATE volunteer_qrcodes v
  SET 
    face_descriptor = array_to_vector(descriptor, 128, true),
    avatar_url = COALESCE(photo_url, v.avatar_url),
    updated_at = now()
  WHERE v.id = qrcode_id
  RETURNING 
    v.id,
    v.volunteer_name,
    (v.face_descriptor IS NOT NULL) as saved,
    v.updated_at;
END;
$$;