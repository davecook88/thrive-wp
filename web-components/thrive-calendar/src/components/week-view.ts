import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { CalendarEvent } from "../types.js";

@customElement("thrive-week-view")
export class ThriveWeekView extends LitElement {
  static styles = css`
    .grid {
      border: 1px solid var(--thrive-grid-line-major, #e6eef6);
      border-top: none;
      border-radius: 0 0 var(--thrive-cal-radius) var(--thrive-cal-radius);
      min-height: 360px;
      background: var(--thrive-cal-bg, #fcfcfd);
      overflow: auto;
      box-shadow: 0 1px 0 rgba(16, 24, 40, 0.02);
    }
    .week-view {
      display: grid;
      grid-template-columns: 72px repeat(7, 1fr);
      grid-template-rows: var(--thrive-cal-header-height);
      position: relative;
      gap: 0;
    }
    .week-view .time-label {
      border-right: 1px solid var(--thrive-grid-line-minor, #f1f5f9);
      padding: 6px 10px 6px 8px;
      font-size: 12px;
      color: var(--thrive-muted-fg, #6b7280);
      text-align: right;
      position: sticky;
      left: 0;
      background: var(--thrive-cal-bg, #fcfcfd);
      z-index: 20;
      height: calc(
        var(--thrive-cal-hour-height, 40px) * var(--thrive-cal-step-frac, 1)
      );
      display: flex;
      align-items: center;
      justify-content: flex-end;
    }
    .week-view .day-header {
      border-bottom: 1px solid var(--thrive-grid-line-major, #e6eef6);
      padding: 8px 6px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      text-align: center;
      background: var(--thrive-cal-header-bg, transparent);
      color: var(--thrive-heading-fg, #0f172a);
      font-weight: 600;
      position: sticky;
      top: 0;
      z-index: 30;
    }
    .week-view .day-header .dow {
      font-size: 12px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      opacity: 0.85;
      font-weight: 700;
      color: var(--thrive-muted-fg, #64748b);
    }
    .week-view .day-header .date {
      font-size: 14px;
      font-weight: 700;
      line-height: 1;
      color: var(--thrive-heading-fg, #0f172a);
    }
    .week-view .day-header.is-today {
      background: var(--thrive-today-bg, #f3f4f6);
      color: var(--thrive-heading-fg, #0f172a);
      box-shadow: inset 0 -2px 0 var(--thrive-accent, #c7d2fe);
    }
    .week-view .time-slot {
      border-right: 1px solid var(--thrive-grid-line-minor, #f1f5f9);
      border-top: 1px solid var(--thrive-grid-line-minor, #f1f5f9);
      position: relative;
      height: calc(
        var(--thrive-cal-hour-height, 40px) * var(--thrive-cal-step-frac, 1)
      );
      background: transparent;
    }
    /* Marks the first slot at the start of an hour boundary */
    .week-view .time-slot.is-hour-start {
      border-top: 1px solid var(--thrive-grid-line-major, #e6eef6);
      background: var(--thrive-row-hour-bg, transparent);
    }
    .week-view .time-slot:hover {
      background: var(--thrive-hover-bg, #f8fafc);
    }
    .events-layer {
      position: absolute;
      inset: 0;
      display: grid;
      grid-template-columns: 72px repeat(7, 1fr);
      grid-template-rows: 1fr;
      pointer-events: none;
      z-index: 1;
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
      background: var(--thrive-cal-event-bg, #eef2f7);
      color: var(--thrive-cal-event-fg, #0f172a);
      padding: 6px 8px;
      border-radius: 8px;
      font-size: 13px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      cursor: pointer;
      z-index: 10;
      pointer-events: auto;
      border: 1px solid transparent;
      box-shadow: 0 1px 0 rgba(16, 24, 40, 0.03);
    }
    .event.class {
      background: var(--thrive-cal-event-class-bg, #c7f9e9);
      color: var(--thrive-cal-event-class-fg, #064e3b);
      border: 1px solid rgba(6, 78, 59, 0.06);
      border-radius: var(--thrive-cal-event-radius, 8px);
    }
    .event.booking {
      background: var(--thrive-cal-event-booking-bg, #fef3e3);
      color: var(--thrive-cal-event-booking-fg, #92400e);
      border: 1px solid rgba(249, 115, 22, 0.06);
      border-radius: var(--thrive-cal-event-radius, 8px);
    }
    .event.availability {
      background: var(--thrive-cal-availability-bg, #f0fdf4);
      color: var(--thrive-cal-availability-fg, #065f46);
      border: 1px dashed rgba(16, 185, 129, 0.18);
    }
    .event.blackout {
      background: repeating-linear-gradient(
        135deg,
        var(--thrive-blackout-bg, #efefef),
        var(--thrive-blackout-bg, #efefef) 6px,
        var(--thrive-blackout-stripe, #f7f7f7) 6px,
        var(--thrive-blackout-stripe, #f7f7f7) 12px
      );
      color: #111827;
      border: 1px solid #e6e9ee;
    }
    .current-time {
      position: absolute;
      left: 8px;
      right: 8px;
      height: 2px;
      background: var(--thrive-accent, #ef4444);
      z-index: 20;
      opacity: 0.95;
    }
    .current-time::before {
      content: "";
      position: absolute;
      left: -6px;
      top: -4px;
      width: 8px;
      height: 8px;
      background: var(--thrive-accent, #ef4444);
      border-radius: 50%;
    }
  `;

  @property({ type: Array }) events: CalendarEvent[] = [];
  @property({ type: Object }) currentDate: Date = new Date();
  @property({ type: Number }) startHour: number = 0;
  @property({ type: Number }) endHour: number = 24;
  @property({ type: Number }) hourHeight: number = 40;
  @property({ type: Number }) headerHeight: number = 40;
  @property({ type: Number }) slotDuration: number = 30;
  @property({ type: Boolean }) showClasses: boolean = true;
  @property({ type: Boolean }) showBookings: boolean = true;
  @property({ type: String }) teacherId?: string;
  @property({ type: String }) timeFormat: "12h" | "24h" = "12h";
  @property({ type: Boolean }) showTimezone: boolean = true;
  @property({ type: String }) timezone: string =
    Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";

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
    let baseOffset = headerHeightPx; // default guess
    if (root && hourStarts.length >= 8) {
      const gridTop = root.getBoundingClientRect().top;
      const first = hourStarts[0]; // day 0, first visible hour
      const secondSameDay = hourStarts[7]; // day 0, next hour boundary
      const d =
        secondSameDay.getBoundingClientRect().top -
        first.getBoundingClientRect().top;
      if (d > 0) pxPerMinute = d / 60;
      // Base offset: distance from top of grid to the top of the first slot
      baseOffset = first.getBoundingClientRect().top - gridTop;
    }

    return { pxPerMinute, headerHeightPx, hourHeightPx, baseOffset };
  }

  private formatTime(date: Date): string {
    if (this.timeFormat === "24h") {
      return date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: this.timezone,
      });
    }
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
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

  // Convert a Date to the configured timezone by creating a local Date that
  // reflects the wall time in that timezone. Useful for extracting Y/M/D/H/M.
  private toZoned(date: Date): Date {
    return new Date(date.toLocaleString("en-US", { timeZone: this.timezone }));
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
      teacherId: this.teacherId,
    });
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
        <div class="day-header" style="justify-content:center;">
          ${this.showTimezone
            ? html`<div class="dow" style="opacity:0.9;">${this.timezone}</div>`
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
                ((this.showClasses &&
                  (ev.type === "class" ||
                    ev.type === "availability" ||
                    ev.type === "blackout")) ||
                  (this.showBookings && ev.type === "booking")) &&
                (!this.teacherId || ev.teacherId === this.teacherId)
            )
            .map((event) => {
              const { top, height, dayIndex } = this.getEventPosition(event);
              if (dayIndex === -1) return nothing;
              return html`
                <div
                  class="event-wrapper"
                  style="grid-column: ${dayIndex + 2}; position: relative;"
                >
                  <div
                    class="event ${event.type}"
                    part="event event-${event.type}"
                    style="top: ${top}px; height: ${height}px;"
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

  render() {
    return html`
      <div class="grid" role="grid" aria-label="Calendar grid">
        ${this.renderWeekView()}
      </div>
    `;
  }
}
