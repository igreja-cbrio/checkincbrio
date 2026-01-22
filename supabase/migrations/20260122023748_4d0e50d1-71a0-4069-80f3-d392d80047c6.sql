-- Drop old constraint and add new one that includes 'facial' method
ALTER TABLE check_ins DROP CONSTRAINT IF EXISTS check_ins_method_check;
ALTER TABLE check_ins ADD CONSTRAINT check_ins_method_check 
  CHECK (method IN ('qr_code', 'manual', 'facial'));