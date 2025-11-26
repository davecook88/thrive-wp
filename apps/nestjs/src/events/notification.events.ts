export class NotificationEvent {
  constructor(
    public readonly userId: number,
    public readonly type: string,
    public readonly data?: Record<string, any>,
  ) {}
}
