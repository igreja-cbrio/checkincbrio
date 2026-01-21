-- Create table for volunteer QR codes (for PC volunteers without accounts)
CREATE TABLE public.volunteer_qrcodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  planning_center_person_id text UNIQUE NOT NULL,
  volunteer_name text NOT NULL,
  qr_code text UNIQUE NOT NULL DEFAULT encode(extensions.gen_random_bytes(16), 'hex'),
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.volunteer_qrcodes ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only leaders can view and manage
CREATE POLICY "Leaders can view volunteer_qrcodes" 
ON public.volunteer_qrcodes 
FOR SELECT 
USING (has_role(auth.uid(), 'leader'::user_role));

CREATE POLICY "Leaders can insert volunteer_qrcodes" 
ON public.volunteer_qrcodes 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'leader'::user_role));

CREATE POLICY "Leaders can update volunteer_qrcodes" 
ON public.volunteer_qrcodes 
FOR UPDATE 
USING (has_role(auth.uid(), 'leader'::user_role));

-- Trigger for updated_at
CREATE TRIGGER update_volunteer_qrcodes_updated_at
BEFORE UPDATE ON public.volunteer_qrcodes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();