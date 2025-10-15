export interface ThriveCalendarContextApi {
  readonly id: string;
  setEventsFromTeacherAvailability(
    startIso: string,
    endIso: string,
    events: any[],
  ): void;
  setSelectedTeacherId(teacherId: string | undefined): void;
  ensureRange(start: Date, end: Date): Promise<void>;
}
