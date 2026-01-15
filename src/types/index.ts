export interface Profile {
  id: string;
  full_name: string;
  email: string;
  planning_center_id: string | null;
  qr_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: 'volunteer' | 'leader' | 'admin';
  created_at: string;
}

export interface Service {
  id: string;
  planning_center_id: string;
  name: string;
  service_type_name: string | null;
  scheduled_at: string;
  created_at: string;
  updated_at: string;
}

export interface Schedule {
  id: string;
  service_id: string;
  volunteer_id: string | null;
  planning_center_person_id: string;
  volunteer_name: string;
  team_name: string | null;
  position_name: string | null;
  created_at: string;
  service?: Service;
  check_in?: CheckIn | null;
}

export interface CheckIn {
  id: string;
  schedule_id: string;
  checked_in_by: string | null;
  checked_in_at: string;
  method: 'qr_code' | 'manual';
}

export interface ScheduleWithDetails extends Schedule {
  service: Service;
  check_in: CheckIn | null;
}
