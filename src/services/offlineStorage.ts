import type { Profile, ScheduleWithDetails, UserRole } from '@/types';

const KEYS = {
  PROFILE: 'offline_profile',
  ROLES: 'offline_roles',
  MY_SCHEDULES: 'offline_my_schedules',
  LAST_SYNC: 'offline_last_sync',
};

// Profile
export function saveProfile(profile: Profile): void {
  try {
    localStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
    setLastSyncTime();
  } catch (error) {
    console.error('Error saving profile offline:', error);
  }
}

export function getProfile(): Profile | null {
  try {
    const data = localStorage.getItem(KEYS.PROFILE);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting offline profile:', error);
    return null;
  }
}

// Roles
export function saveRoles(roles: UserRole[]): void {
  try {
    localStorage.setItem(KEYS.ROLES, JSON.stringify(roles));
  } catch (error) {
    console.error('Error saving roles offline:', error);
  }
}

export function getRoles(): UserRole[] {
  try {
    const data = localStorage.getItem(KEYS.ROLES);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting offline roles:', error);
    return [];
  }
}

// My Schedules
export function saveMySchedules(schedules: ScheduleWithDetails[]): void {
  try {
    localStorage.setItem(KEYS.MY_SCHEDULES, JSON.stringify(schedules));
    setLastSyncTime();
  } catch (error) {
    console.error('Error saving schedules offline:', error);
  }
}

export function getMySchedules(): ScheduleWithDetails[] {
  try {
    const data = localStorage.getItem(KEYS.MY_SCHEDULES);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting offline schedules:', error);
    return [];
  }
}

// Sync time
export function setLastSyncTime(): void {
  localStorage.setItem(KEYS.LAST_SYNC, new Date().toISOString());
}

export function getLastSyncTime(): Date | null {
  try {
    const data = localStorage.getItem(KEYS.LAST_SYNC);
    return data ? new Date(data) : null;
  } catch {
    return null;
  }
}

// Clear all offline data (on logout)
export function clearOfflineData(): void {
  Object.values(KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}
