-- First, remove any duplicate schedules (keep the most recent one)
DELETE FROM schedules a
USING schedules b
WHERE a.id > b.id 
  AND a.service_id = b.service_id 
  AND a.planning_center_person_id = b.planning_center_person_id;

-- Create unique constraint for upsert to work correctly
ALTER TABLE schedules 
ADD CONSTRAINT schedules_service_person_unique 
UNIQUE (service_id, planning_center_person_id);