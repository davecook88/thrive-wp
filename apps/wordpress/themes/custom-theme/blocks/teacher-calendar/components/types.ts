export interface Rule {
  id?: string;
  weekday: string; // String representation of dayOfWeek (0-6)
  startTimeMinutes: number; // UI representation: minutes from midnight
  endTimeMinutes: number; // UI representation: minutes from midnight
  kind: string;
}

export interface ExceptionRule {
  id?: string;
  date: string;
  kind: string; // "available" or "unavailable"
  startTimeMinutes?: number; // UI representation: minutes from midnight
  endTimeMinutes?: number; // UI representation: minutes from midnight
}
