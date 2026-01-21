-- Add confirmation_status column to schedules table
ALTER TABLE schedules 
ADD COLUMN confirmation_status text DEFAULT 'confirmed';

COMMENT ON COLUMN schedules.confirmation_status IS 'Status from Planning Center: confirmed, pending, declined';