import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { CalendarEvent } from "../types.js";

@customElement("thrive-week-view")
export class ThriveWeekView extends LitElement {
  static styles = css`
    .grid {
      border: var(--thrive-cal-border);
      border-top: none;
      border-radius: 0 0 var(--thrive-cal-radius) var(--thrive-cal-radius);
      min-height: 360px;
      background: var(--thrive-cal-bg, #fff);
      overflow: auto;
    }
    .week-view {
      display: grid;
      grid-template-columns: 80px repeat(7, 1fr);
      grid-template-rows: var(--thrive-cal-header-height) auto;
      position: relative;
    }
    .week-view .time-label {
      border-right: var(--thrive-cal-border);
      padding: 4px 8px 4px 4px;
      font-size: 12px;
      color: var(--thrive-cal-time-fg);
      text-align: right;
      position: sticky;
      left: 0;
      background: var(--thrive-cal-bg, #fff);
      z-index: 20;
    }
    .week-view .day-header {
      border-bottom: var(--thrive-cal-border);
      padding: 6px 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      text-align: center;
      background: var(--thrive-cal-header-bg);
      color: var(--thrive-cal-header-fg);
      font-weight: 600;
      position: sticky;
      top: 0;
      z-index: 30;
      box-shadow: inset 0 -1px 0 var(--thrive-cal-grid-line-major);
    }
    .week-view .day-header .dow {
      font-size: 11px;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      opacity: 0.85;
    }
    .week-view .day-header .date {
      font-size: 16px;
      font-weight: 700;
      line-height: 1;
    }
    .week-view .day-header.is-today {
      background: var(--thrive-cal-today-bg);
      color: var(--thrive-cal-today-fg);
    }
    .week-view .day-header.is-today::after {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      border-top: 8px solid var(--thrive-cal-today-fg);
      border-right: 8px solid transparent;
    }
    .week-view .time-slot {
      border-right: var(--thrive-cal-border);
      border-bottom: 1px solid var(--thrive-cal-grid-line-minor);
      position: relative;
      min-height: calc(var(--thrive-cal-hour-height) / 2);
    }
    .week-view .time-slot.is-hour {
      border-bottom: 1px solid var(--thrive-cal-grid-line-major);
      background: var(--thrive-cal-row-hour-bg, transparent);
    }
    .week-view .time-slot:hover {
      background: var(--thrive-cal-slot-hover);
    }
    .events-layer {
      position: absolute;
      inset: 0;
      display: grid;
      grid-template-columns: 80px repeat(7, 1fr);
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
      left: 2px;
      right: 2px;
      box-sizing: border-box;
      background: var(--thrive-cal-event-bg, #f5f7fa);
      color: var(--thrive-cal-event-fg, #111827);
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 12px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      cursor: pointer;
      z-index: 10;
      pointer-events: auto;
      border: 1px solid rgba(17, 24, 39, 0.08);
      box-shadow: none;
    }
    .event.class {
      background: var(--thrive-cal-event-class-bg, #10b981);
      color: var(--thrive-cal-event-class-fg, #ffffff);
      border: var(--thrive-cal-event-class-border, none);
      border-radius: var(--thrive-cal-event-radius, 3px);
    }
    .event.booking {
      background: var(--thrive-cal-event-booking-bg, #f59e0b);
      color: var(--thrive-cal-event-booking-fg, #ffffff);
      border: var(--thrive-cal-event-booking-border, none);
      border-radius: var(--thrive-cal-event-radius, 3px);
    }
    .event.availability {
      background: var(--thrive-cal-availability-bg);
      color: var(--thrive-cal-availability-fg);
      border: 1px dashed rgba(16, 185, 129, 0.6);
    }
    .event.blackout {
      background: repeating-linear-gradient(
        135deg,
        var(--thrive-cal-blackout-bg),
        var(--thrive-cal-blackout-bg) 6px,
        var(--thrive-cal-blackout-stripe) 6px,
        var(--thrive-cal-blackout-stripe) 12px
      );
      color: #111827;
      border: 1px solid #dcdfe4;
    }
    .current-time {
      position: absolute;
      left: 0;
      right: 0;
      height: 2px;
      background: #ef4444;
      z-index: 20;
    }
    .current-time::before {
      content: "";
      position: absolute;
      left: -4px;
      top: -3px;
      width: 8px;
      height: 8px;
      background: #ef4444;
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

  private emit(name: string, detail?: any) {
    this.dispatchEvent(
      new CustomEvent(name, { detail, bubbles: true, composed: true })
    );
  }

  private getWeekDates(date: Date): Date[] {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);

    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      dates.push(d);
    }
    return dates;
  }

  private formatTime(date: Date): string {
    if (this.timeFormat === "24h") {
      return date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  private getEventPosition(event: CalendarEvent): {
    top: number;
    height: number;
    dayIndex: number;
  } {
    const start = new Date(event.startUtc);
    const end = new Date(event.endUtc);
    const weekDates = this.getWeekDates(this.currentDate);

    const dayIndex = weekDates.findIndex(
      (d) => d.toDateString() === start.toDateString()
    );

    if (dayIndex === -1) return { top: 0, height: 0, dayIndex: -1 };

    const startOfDay = new Date(start);
    startOfDay.setHours(0, 0, 0, 0);
    const minutesFromStart = Math.max(
      0,
      Math.min(
        24 * 60,
        Math.round((start.getTime() - startOfDay.getTime()) / 60000)
      )
    );

    const durationMinutes = Math.max(
      0,
      Math.round((end.getTime() - start.getTime()) / 60000)
    );

    const visibleStart = this.startHour * 60;
    const visibleEnd = this.endHour * 60;
    const clampedStart = Math.max(minutesFromStart, visibleStart);
    const pxPerMinute = this.hourHeight / 60;
    const top = (clampedStart - visibleStart) * pxPerMinute;

    const dayHeight = (this.endHour - this.startHour) * this.hourHeight;
    const heightRaw = durationMinutes * pxPerMinute;
    const height = Math.max(2, Math.min(heightRaw, dayHeight - top));

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
      <div class="week-view">
        <div class="day-header" style="justify-content:center;">
          ${this.showTimezone
            ? html`<div class="dow" style="opacity:0.9;">UTC</div>`
            : nothing}
        </div>
        ${weekDates.map((date) => {
          const now = new Date();
          const isToday = date.toDateString() === now.toDateString();
          const dow = date.toLocaleDateString("en-US", { weekday: "short" });
          const day = date.getDate();
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
                  class="time-slot ${showHourLabel ? "is-hour" : ""}"
                  style="min-height: calc(var(--thrive-cal-hour-height) * ${step /
                  60});"
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
                    style="top: ${top +
                    this.headerHeight}px; height: ${height}px;"
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
      (d) => d.toDateString() === now.toDateString()
    );

    if (todayIndex === -1) return nothing;

    const minutes = now.getHours() * 60 + now.getMinutes();
    const visibleStart = this.startHour * 60;
    const visibleEnd = this.endHour * 60;
    const clamped = Math.max(visibleStart, Math.min(minutes, visibleEnd));
    const rawTop =
      ((clamped - visibleStart) / 60) * this.hourHeight + this.headerHeight;
    const maxTop =
      this.headerHeight + (this.endHour - this.startHour) * this.hourHeight;
    const top = Math.max(this.headerHeight, Math.min(rawTop, maxTop - 1));

    return html`
      <div
        class="indicator-wrapper"
        style="grid-column: ${todayIndex + 2}; position: relative;"
      >
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
