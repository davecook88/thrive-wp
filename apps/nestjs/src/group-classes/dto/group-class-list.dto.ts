export interface GroupClassListDto {
  id: number;
  title: string;
  description: string | null;
  capacityMax: number;
  isActive: boolean;
  levels: Array<{
    id: number;
    code: string;
    name: string;
  }>;
  teachers: Array<{
    teacherId: number;
    userId: number;
    name: string;
    isPrimary: boolean;
  }>;
  upcomingSessionsCount: number;
  sessions?: Array<{
    id: number;
    startAt: Date;
    endAt: Date;
    status: string;
    enrolledCount: number;
    waitlistCount: number;
  }>;
}
