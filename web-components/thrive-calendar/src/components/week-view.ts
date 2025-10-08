import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { CalendarEvent } from "../types.js";

@customElement("thrive-week-view")
export class ThriveWeekView extends LitElement {
  static styles = css`
    .grid {
      border: 1px solid var(--thrive-grid-line-major, #e5e7eb);
      border-top: none;
      border-radius: 0 0 var(--thrive-cal-radius, 12px) var(--thrive-cal-radius, 12px);
      min-height: 360px;
      background: var(--thrive-cal-bg, #ffffff);
      overflow: auto;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      position: relative;
    }
    .week-view {
      display: grid;
      grid-template-columns: 72px repeat(7, minmax(180px, 1fr));
      position: relative;
      gap: 0;
      min-width: 100%;
    }

    /* Make grid scrollable while keeping time labels fixed */
    .grid::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    .grid::-webkit-scrollbar-track {
      background: var(--thrive-grid-line-minor, #f3f4f6);
    }
    .grid::-webkit-scrollbar-thumb {
      background: var(--thrive-muted-fg, #6b7280);
      border-radius: 4px;
    }
    .grid::-webkit-scrollbar-corner {
      background: var(--thrive-grid-line-minor, #f3f4f6);
    }

    @media (max-width: 768px) {
      .week-view {
        grid-template-columns: 60px repeat(7, 160px);
        min-width: 1180px;
      }
    }

    @media (max-width: 600px) {
      .week-view {
        grid-template-columns: 55px repeat(7, 140px);
        min-width: 1035px;
      }
    }

    @media (max-width: 400px) {
      .week-view {
        grid-template-columns: 50px repeat(7, 130px);
        min-width: 960px;
      }
    }
    .week-view .time-label {
      border-right: 2px solid var(--thrive-grid-line-minor, #f3f4f6);
      padding: 6px 8px 6px 4px;
      font-size: 11px;
      font-weight: 600;
      color: var(--thrive-muted-fg, #6b7280);
      text-align: right;
      position: sticky;
      left: 0;
      background: var(--thrive-cal-bg, #ffffff);
      z-index: 25;
      height: calc(
        var(--thrive-cal-hour-height, 60px) * var(--thrive-cal-step-frac, 1)
      );
      display: flex;
      align-items: center;
      justify-content: flex-end;
      box-shadow: 2px 0 4px -1px rgba(0, 0, 0, 0.1);
    }

    @media (max-width: 600px) {
      .week-view .time-label {
        font-size: 10px;
        padding: 4px 6px 4px 2px;
      }
    }

    .week-view .time-slot {
      border-right: 1px solid var(--thrive-grid-line-minor, #f3f4f6);
      border-top: 1px solid var(--thrive-grid-line-minor, #f3f4f6);
      position: relative;
      height: calc(
        var(--thrive-cal-hour-height, 40px) * var(--thrive-cal-step-frac, 1)
      );
      background: transparent;
      transition: background 0.15s ease;
    }
    /* Marks the first slot at the start of an hour boundary */
    .week-view .time-slot.is-hour-start {
      border-top: 1px solid var(--thrive-grid-line-major, #e5e7eb);
      background: var(--thrive-row-hour-bg, transparent);
    }
    .week-view .time-slot:hover {
      background: var(--thrive-hover-bg, #f9fafb);
    }
    .events-layer {
      position: absolute;
      inset: 0;
      display: grid;
      grid-template-columns: 72px repeat(7, minmax(180px, 1fr));
      grid-template-rows: 1fr;
      pointer-events: none;
      z-index: 1;
      min-width: 100%;
    }

    @media (max-width: 768px) {
      .events-layer {
        grid-template-columns: 60px repeat(7, 160px);
        min-width: 1180px;
      }
    }

    @media (max-width: 600px) {
      .events-layer {
        grid-template-columns: 55px repeat(7, 140px);
        min-width: 1035px;
      }
    }

    @media (max-width: 400px) {
      .events-layer {
        grid-template-columns: 50px repeat(7, 130px);
        min-width: 960px;
      }
    }
    .event-wrapper,
    .indicator-wrapper {
      position: relative;
      grid-row: 1;
      pointer-events: none;
    }
    .event {
      position: absolute;
      left: 6px;
      right: 6px;
      box-sizing: border-box;
      background: var(--thrive-cal-event-bg, #f3f4f6);
      color: var(--thrive-cal-event-fg, #1f2937);
      padding: 8px 10px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 500;
      overflow: hidden;
      cursor: pointer;
      z-index: 10;
      pointer-events: auto;
      border: 1px solid transparent;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      display: flex;
      align-items: center;
      line-height: 1.3;
    }
    .event.multiline {
      white-space: normal;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      align-items: flex-start;
      padding-top: 6px;
    }
    .event.single-line {
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .event:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      z-index: 15;
      overflow: visible;
    }
    .event:hover::after {
      content: attr(data-title);
      position: absolute;
      left: 0;
      top: 100%;
      margin-top: 4px;
      background: #111827;
      color: white;
      padding: 6px 10px;
      border-radius: 8px;
      font-size: 13px;
      white-space: nowrap;
      z-index: 100;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      max-width: 300px;
      pointer-events: none;
    }
    .event.overlapping {
      right: auto;
      width: calc(50% - 9px);
    }
    .event.overlapping.offset {
      left: calc(50% + 3px);
    }
    .event.class {
      background: var(--thrive-cal-event-class-bg, #ecfdf5);
      color: var(--thrive-cal-event-class-fg, #065f46);
      border: 1px solid rgba(16, 185, 129, 0.2);
      border-radius: var(--thrive-cal-event-radius, 12px);
    }
    .event.booking {
      background: var(--thrive-cal-event-booking-bg, #fff7ed);
      color: var(--thrive-cal-event-booking-fg, #c2410c);
      border: 1px solid rgba(255, 87, 34, 0.2);
      border-radius: var(--thrive-cal-event-radius, 12px);
    }
    .event.availability {
      background: var(--thrive-cal-availability-bg, #ecfdf5);
      color: var(--thrive-cal-availability-fg, #065f46);
      border: 1px dashed rgba(16, 185, 129, 0.3);
      border-radius: var(--thrive-cal-event-radius, 12px);
    }
    .event.blackout {
      background: repeating-linear-gradient(
        135deg,
        var(--thrive-blackout-bg, #f3f4f6),
        var(--thrive-blackout-bg, #f3f4f6) 6px,
        var(--thrive-blackout-stripe, #f9fafb) 6px,
        var(--thrive-blackout-stripe, #f9fafb) 12px
      );
      color: #111827;
      border: 1px solid #e5e7eb;
      border-radius: var(--thrive-cal-event-radius, 12px);
    }
    .current-time {
      position: absolute;
      left: 8px;
      right: 8px;
      height: 2px;
      background: var(--thrive-accent, #ff5722);
      z-index: 20;
      opacity: 0.9;
      box-shadow: 0 0 4px rgba(255, 87, 34, 0.4);
    }
    .current-time::before {
      content: "";
      position: absolute;
      left: -6px;
      top: -4px;
      width: 10px;
      height: 10px;
      background: var(--thrive-accent, #ff5722);
      border-radius: 50%;
      box-shadow: 0 0 6px rgba(255, 87, 34, 0.5);
    }
    .header {
      display: grid;
      grid-template-columns: 72px repeat(7, minmax(180px, 1fr));
      position: sticky;
      top: 0;
      z-index: 30;
      background: var(--thrive-cal-bg, #ffffff);
      min-width: 100%;
    }

    @media (max-width: 768px) {
      .header {
        grid-template-columns: 60px repeat(7, 160px);
        min-width: 1180px;
      }
    }

    @media (max-width: 600px) {
      .header {
        grid-template-columns: 55px repeat(7, 140px);
        min-width: 1035px;
      }
    }

    @media (max-width: 400px) {
      .header {
        grid-template-columns: 50px repeat(7, 130px);
        min-width: 960px;
      }
    }
    .header .day-header {
      border-bottom: 1px solid var(--thrive-grid-line-major, #e5e7eb);
      padding: 10px 6px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      text-align: center;
      background: var(--thrive-cal-header-bg, transparent);
      color: var(--thrive-heading-fg, #111827);
      font-weight: 600;
      min-width: 0;
      overflow: hidden;
    }
    .header .day-header:first-child {
      position: sticky;
      left: 0;
      z-index: 35;
      background: var(--thrive-cal-bg, #ffffff);
      box-shadow: 2px 0 4px -1px rgba(0, 0, 0, 0.1);
      border-right: 2px solid var(--thrive-grid-line-minor, #f3f4f6);
    }
    .header .day-header .dow {
      font-size: 11px;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      opacity: 0.8;
      font-weight: 600;
      color: var(--thrive-muted-fg, #6b7280);
      white-space: nowrap;
    }
    .header .day-header .date {
      font-size: 16px;
      font-weight: 700;
      line-height: 1;
      color: var(--thrive-heading-fg, #111827);
    }
    .header .day-header.is-today {
      background: var(--thrive-today-bg, #fff7ed);
      color: var(--thrive-heading-fg, #111827);
      box-shadow: inset 0 -3px 0 var(--thrive-accent, #ff5722);
    }

    @media (max-width: 768px) {
      .header .day-header {
        padding: 8px 3px;
        gap: 2px;
      }
      .header .day-header .dow {
        font-size: 9px;
        letter-spacing: 0;
      }
      .header .day-header .date {
        font-size: 14px;
      }
    }

    @media (max-width: 600px) {
      .header .day-header {
        padding: 8px 2px;
        gap: 2px;
      }
      .header .day-header .dow {
        font-size: 8px;
        letter-spacing: 0;
      }
      .header .day-header .date {
        font-size: 13px;
      }
    }

    @media (max-width: 400px) {
      .header .day-header {
        padding: 6px 2px;
        gap: 1px;
      }
      .header .day-header .dow {
        font-size: 7px;
      }
      .header .day-header .date {
        font-size: 12px;
      }
    }
  `;

  @property({ type: Array }) events: CalendarEvent[] = [];
  @property({ type: Object }) currentDate: Date = new Date();
  @property({ type: Number }) startHour: number = 0;
  @property({ type: Number }) endHour: number = 24;
  @property({ type: Number }) hourHeight: number = 60;
  @property({ type: Number }) headerHeight: number = 48;
  @property({ type: Number }) slotDuration: number = 30;
  @property({ type: Boolean }) showClasses: boolean = true;
  @property({ type: Boolean }) showBookings: boolean = true;
  @property({ type: String }) timeFormat: "12h" | "24h" = "12h";
  @property({ type: Boolean }) showTimezone: boolean = true;
  @property({ type: String }) timezone: string =
    Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
  @property({ type: Number }) viewHeight: number = 400;

  private emit(name: string, detail?: any) {
    this.dispatchEvent(
      new CustomEvent(name, { detail, bubbles: true, composed: true })
    );
  }

  // Read the actual pixel rhythm used by the grid from CSS variables so
  // calculations match the rendered layout even if theme CSS overrides values.
  private getPxMetrics() {
    const root = this.renderRoot.querySelector(
      ".week-view"
    ) as HTMLElement | null;
    const styles = root ? getComputedStyle(root) : undefined;
    const cssHour = styles
      ? parseFloat(styles.getPropertyValue("--thrive-cal-hour-height"))
      : NaN;
    const cssHeader = styles
      ? parseFloat(styles.getPropertyValue("--thrive-cal-header-height"))
      : NaN;

    // Fallbacks from props when CSS vars aren't readable
    let hourHeightPx =
      Number.isFinite(cssHour) && cssHour > 0 ? cssHour : this.hourHeight;
    let headerHeightPx =
      Number.isFinite(cssHeader) && cssHeader >= 0
        ? cssHeader
        : this.headerHeight;

    // Measure real per-minute scaling including borders using two consecutive
    // hour-start slots in the first day column. This captures any border/padding.
    const hourStarts = Array.from(
      this.renderRoot.querySelectorAll<HTMLDivElement>(
        ".time-slot.is-hour-start"
      )
    );
    let pxPerMinute = hourHeightPx / 60; // default
    const baseOffset = 0; // default, since header is separate
    if (root && hourStarts.length >= 8) {
      const first = hourStarts[0]; // day 0, first visible hour
      const secondSameDay = hourStarts[7]; // day 0, next hour boundary
      const d =
        secondSameDay.getBoundingClientRect().top -
        first.getBoundingClientRect().top;
      if (d > 0) pxPerMinute = d / 60;
    }

    return { pxPerMinute, headerHeightPx, hourHeightPx, baseOffset };
  }

  private formatTime(date: Date): string {
    if (this.timeFormat === "24h") {
      return date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        hour12: false,
        timeZone: this.timezone,
      });
    }
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      hour12: true,
      timeZone: this.timezone,
    });
  }

  // Helpers to work with values in the configured timezone
  private zonedDateKey(date: Date): string {
    // Stable YYYY-MM-DD in the configured timezone
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: this.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }

  private zonedHM(date: Date): { h: number; m: number } {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: this.timezone,
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(date);
    const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
    const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
    return { h, m };
  }

  private zonedDowIndex(date: Date): number {
    const dowStr = new Intl.DateTimeFormat("en-US", {
      timeZone: this.timezone,
      weekday: "short",
    }).format(date);
    const map: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    return map[dowStr as keyof typeof map] ?? 0;
  }

  private getWeekDates(date: Date): Date[] {
    // Compute week dates based on configured timezone (Sunday start)
    const startOfWeek = new Date(date);
    const dow = this.zonedDowIndex(date);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(startOfWeek.getDate() - dow);

    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      dates.push(d);
    }
    return dates;
  }

  private getEventPosition(event: CalendarEvent): {
    top: number;
    height: number;
    dayIndex: number;
  } {
    const start = new Date(event.startUtc);
    const end = new Date(event.endUtc);
    const weekDates = this.getWeekDates(this.currentDate);

    const startKey = this.zonedDateKey(start);
    const dayIndex = weekDates.findIndex(
      (d) => this.zonedDateKey(d) === startKey
    );

    if (dayIndex === -1) return { top: 0, height: 0, dayIndex: -1 };

    // Minutes from midnight in the configured timezone
    const hm = this.zonedHM(start);
    const minutesFromStart = hm.h * 60 + hm.m;

    const durationMinutes = Math.max(
      0,
      Math.round((end.getTime() - start.getTime()) / 60000)
    );

    const visibleStart = this.startHour * 60;
    const clampedStart = Math.max(minutesFromStart, visibleStart);
    const { pxPerMinute, baseOffset } = this.getPxMetrics();
    const top = baseOffset + (clampedStart - visibleStart) * pxPerMinute;

    const height = durationMinutes * pxPerMinute;

    return { top, height, dayIndex };
  }

  private onEventClick(event: CalendarEvent) {
    this.emit("event:click", { event });
  }

  private onSlotClick(minutesFromStart: number, dayIndex: number) {
    const weekDates = this.getWeekDates(this.currentDate);
    const clickedDate = new Date(weekDates[dayIndex]);
    const h = Math.floor(minutesFromStart / 60);
    const m = minutesFromStart % 60;
    clickedDate.setHours(h, m, 0, 0);

    const startUtc = clickedDate.toISOString();
    const endUtc = new Date(
      clickedDate.getTime() + this.slotDuration * 60 * 1000
    ).toISOString();

    this.emit("slot:select", {
      startUtc,
      endUtc,
    });
  }

  private renderHeader() {
    const weekDates = this.getWeekDates(this.currentDate);

    const timezoneOffset = new Date().getTimezoneOffset();
    const timezoneOffsetString = `UTC${
      timezoneOffset < 0 ? "+" : "-"
    }${Math.abs(timezoneOffset / 60)}`;
    return html`
      <div class="header">
        <div class="day-header" style="justify-content:center;">
          ${this.showTimezone
            ? html`<div class="dow" style="opacity:0.9;">
                ${timezoneOffsetString}
              </div>`
            : nothing}
        </div>
        ${weekDates.map((date) => {
          const now = new Date();
          const isToday = this.zonedDateKey(date) === this.zonedDateKey(now);
          const dow = date.toLocaleDateString("en-US", {
            weekday: "short",
            timeZone: this.timezone,
          });
          const day = Number(
            date.toLocaleDateString("en-CA", {
              day: "2-digit",
              timeZone: this.timezone,
            })
          );
          return html` <div class="day-header ${isToday ? "is-today" : ""}">
            <div class="dow">${dow}</div>
            <div class="date">${day}</div>
          </div>`;
        })}
      </div>
    `;
  }

  private renderWeekView() {
    const weekDates = this.getWeekDates(this.currentDate);

    const step = Math.max(5, Math.min(60, this.slotDuration));
    const visibleMinutes = (this.endHour - this.startHour) * 60;
    const steps = Array.from(
      { length: Math.ceil(visibleMinutes / step) },
      (_, i) => this.startHour * 60 + i * step
    );

    return html`
      <div
        class="week-view"
        style="
          --thrive-cal-hour-height: ${this.hourHeight}px;
          --thrive-cal-header-height: ${this.headerHeight}px;
          --thrive-cal-step-frac: ${Math.max(
          5,
          Math.min(60, this.slotDuration)
        ) / 60};
        "
      >
        ${steps.map((minutesFromStart) => {
          const labelDate = new Date();
          labelDate.setHours(0, 0, 0, 0);
          labelDate.setMinutes(minutesFromStart);
          const label = this.formatTime(labelDate);
          const showHourLabel = minutesFromStart % 60 === 0;
          return html`
            <div class="time-label">${showHourLabel ? label : ""}</div>
            ${weekDates.map(
              (_, dayIndex) => html`
                <div
                  class="time-slot ${showHourLabel
                    ? "is-hour-start"
                    : "is-step"}"
                  @click=${() => this.onSlotClick(minutesFromStart, dayIndex)}
                ></div>
              `
            )}
          `;
        })}

        <div class="events-layer">
          ${this.events
            .filter(
              (ev) =>
                (this.showClasses &&
                  (ev.type === "class" ||
                    ev.type === "availability" ||
                    ev.type === "blackout")) ||
                (this.showBookings && ev.type === "booking")
            )
            .map((event) => {
              const { top, height, dayIndex } = this.getEventPosition(event);
              if (dayIndex === -1) return nothing;

              // Determine if event should show multiline (>45min duration)
              const durationMinutes = Math.round(
                (new Date(event.endUtc).getTime() - new Date(event.startUtc).getTime()) / 60000
              );
              const isMultiline = durationMinutes > 45 && height > 50;

              // Check for overlaps with other events in same day/time
              const overlaps = this.events.filter(other => {
                if (other === event) return false;
                const otherPos = this.getEventPosition(other);
                if (otherPos.dayIndex !== dayIndex) return false;
                // Check if time ranges overlap
                const thisStart = new Date(event.startUtc).getTime();
                const thisEnd = new Date(event.endUtc).getTime();
                const otherStart = new Date(other.startUtc).getTime();
                const otherEnd = new Date(other.endUtc).getTime();
                return (thisStart < otherEnd && thisEnd > otherStart);
              });

              const hasOverlap = overlaps.length > 0;
              const isOffset = hasOverlap && overlaps.some(other =>
                new Date(other.startUtc).getTime() < new Date(event.startUtc).getTime()
              );

              return html`
                <div
                  class="event-wrapper"
                  style="grid-column: ${dayIndex + 2}; position: relative;"
                >
                  <div
                    class="event ${event.type} ${isMultiline ? 'multiline' : 'single-line'} ${hasOverlap ? 'overlapping' : ''} ${isOffset ? 'offset' : ''}"
                    part="event event-${event.type}"
                    style="top: ${top}px; height: ${height}px;"
                    data-title="${event.title}"
                    @click=${() => this.onEventClick(event)}
                  >
                    ${event.title}
                  </div>
                </div>
              `;
            })}
          ${this.renderCurrentTime()}
        </div>
      </div>
    `;
  }

  private renderCurrentTime() {
    const now = new Date();
    const weekDates = this.getWeekDates(this.currentDate);
    const todayIndex = weekDates.findIndex(
      (d) => this.zonedDateKey(d) === this.zonedDateKey(now)
    );

    if (todayIndex === -1) return nothing;

    // Use the timezone-aware hour and minute calculation
    const { h, m } = this.zonedHM(now);
    const minutes = h * 60 + m;

    const visibleStart = this.startHour * 60;
    const visibleEnd = this.endHour * 60;
    const clamped = Math.max(visibleStart, Math.min(minutes, visibleEnd));

    // Calculate position relative to visible area, using measured CSS rhythm
    const { pxPerMinute, baseOffset } = this.getPxMetrics();
    const top = baseOffset + (clamped - visibleStart) * pxPerMinute;

    return html`
      <div class="indicator-wrapper" style="grid-column: ${todayIndex + 2};">
        <div
          class="current-time"
          part="current-time"
          style="top: ${top}px;"
        ></div>
      </div>
    `;
  }

  private scrollToCurrentTime() {
    // Scroll the actual scroll container (.week-view) so measurements from
    // getPxMetrics (which are relative to .week-view) line up with scrollTop.
    const now = new Date();
    const weekDates = this.getWeekDates(this.currentDate);
    const todayIndex = weekDates.findIndex(
      (d) => this.zonedDateKey(d) === this.zonedDateKey(now)
    );

    if (todayIndex === -1) return;

    // Use the timezone-aware hour and minute calculation
    const { h, m } = this.zonedHM(now);
    const minutes = h * 60 + m;

    const visibleStart = this.startHour * 60;
    const visibleEnd = this.endHour * 60;
    const clamped = Math.max(visibleStart, Math.min(minutes, visibleEnd));

    // Calculate position relative to visible area (values are relative to .week-view)
    const { pxPerMinute, baseOffset } = this.getPxMetrics();
    const currentTimeTop = baseOffset + (clamped - visibleStart) * pxPerMinute;

    // Get the actual scrollable week view element (it sets height and overflow)
    const weekView = this.renderRoot.querySelector(
      ".week-view"
    ) as HTMLElement | null;
    if (!weekView) return;

    // Center the current time within the visible viewport of the week view
    const targetScrollTop = currentTimeTop - weekView.clientHeight / 2;

    // Clamp to valid scroll range
    const maxScroll = Math.max(
      0,
      weekView.scrollHeight - weekView.clientHeight
    );
    const clampedScrollTop = Math.max(0, Math.min(targetScrollTop, maxScroll));

    weekView.scrollTo({ top: clampedScrollTop, behavior: "smooth" });
  }

  firstUpdated() {
    // Schedule scroll after layout so measurements are stable
    requestAnimationFrame(() => this.scrollToCurrentTime());
  }

  render() {
    return html`
      <div class="grid" role="grid" aria-label="Calendar grid" style="max-height: ${this.viewHeight}px;">
        ${this.renderHeader()} ${this.renderWeekView()}
      </div>
    `;
  }
}
