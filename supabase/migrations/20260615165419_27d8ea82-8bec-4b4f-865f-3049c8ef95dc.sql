DROP POLICY IF EXISTS "Service role can insert sync logs" ON public.sync_logs;

CREATE POLICY "Service role can insert sync logs"
ON public.sync_logs
FOR INSERT
TO service_role
WITH CHECK (true);