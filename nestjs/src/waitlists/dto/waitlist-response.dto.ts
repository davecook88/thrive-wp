export interface WaitlistResponseDto {
  id: number;
  sessionId: number;
  position: number;
  notifiedAt: string | null;
  notificationExpiresAt: string | null;
  createdAt: string;
}

export interface WaitlistWithSessionDto extends WaitlistResponseDto {
  session: {
    id: number;
    startAt: string;
    endAt: string;
    type: string;
    groupClass?: {
      id: number;
      title: string;
      levels: Array<{
        code: string;
        name: string;
      }>;
    };
  };
}

export interface WaitlistWithStudentDto extends WaitlistResponseDto {
  student: {
    id: number;
    userId: number;
    name: string;
    email: string;
  };
}
