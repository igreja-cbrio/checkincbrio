-- Create sync_logs table to track synchronization history
CREATE TABLE public.sync_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_type text NOT NULL DEFAULT 'manual',
  services_synced integer NOT NULL DEFAULT 0,
  schedules_synced integer NOT NULL DEFAULT 0,
  qrcodes_generated integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'success',
  error_message text,
  triggered_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- Leaders can view all sync logs
CREATE POLICY "Leaders can view sync logs"
  ON public.sync_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'leader'::user_role));

-- Service role can insert sync logs (from edge functions)
CREATE POLICY "Service role can insert sync logs"
  ON public.sync_logs
  FOR INSERT
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_sync_logs_created_at ON public.sync_logs(created_at DESC);