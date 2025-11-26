/**
 * Session lifecycle events for Google Meet integration
 */

export class SessionScheduledEvent {
  static readonly eventName = "session.scheduled";

  constructor(
    public readonly sessionId: number,
    public readonly teacherId: number,
    public readonly startAt: Date,
    public readonly endAt: Date,
    public readonly title?: string,
  ) {}
}

export class SessionRescheduledEvent {
  static readonly eventName = "session.rescheduled";

  constructor(
    public readonly sessionId: number,
    public readonly teacherId: number,
    public readonly oldStartAt: Date,
    public readonly oldEndAt: Date,
    public readonly newStartAt: Date,
    public readonly newEndAt: Date,
    public readonly title?: string,
  ) {}
}

export class SessionCanceledEvent {
  static readonly eventName = "session.canceled";

  constructor(
    public readonly sessionId: number,
    public readonly teacherId: number,
    public readonly reason?: string,
  ) {}
}
