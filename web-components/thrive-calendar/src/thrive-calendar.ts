import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type {
  ViewMode,
  UIMode,
  CalendarEvent,
  CalendarRange,
  ISODateTimeUTC,
} from "./types.js";

@customElement("thrive-calendar")
export class ThriveCalendar extends LitElement {
  static styles = css`
    :host {
      display: block;
      font: normal 14px/1.4 system-ui, -apple-system, Segoe UI, Roboto, Ubuntu,
        Cantarell, Noto Sans, Arial, "Apple Color Emoji", "Segoe UI Emoji";
      color: var(--thrive-cal-fg, #0f172a);
    }
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      border: 1px solid #e5e7eb;
      border-radius: 8px 8px 0 0;
      background: var(--thrive-cal-toolbar-bg, #f8fafc);
    }
    .toolbar .nav-buttons {
      display: flex;
      gap: 4px;
    }
    .toolbar button {
      padding: 4px 8px;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      background: white;
      cursor: pointer;
    }
    .toolbar button:hover {
      background: #f3f4f6;
    }
    .toolbar .view-buttons {
      display: flex;
      gap: 2px;
    }
    .toolbar .view-buttons button.active {
      background: #3b82f6;
      color: white;
    }
    .grid {
      border: 1px solid #e5e7eb;
      border-top: none;
      border-radius: 0 0 8px 8px;
      min-height: 360px;
      background: var(--thrive-cal-bg, #fff);
      overflow: auto;
    }
    .week-view {
      display: grid;
      grid-template-columns: 60px repeat(7, 1fr);
      grid-template-rows: 40px repeat(24, 40px);
      position: relative; /* Ensure absolutely-positioned events are relative to the grid */
    }
    .week-view .time-label {
      border-right: 1px solid #e5e7eb;
      padding: 4px;
      font-size: 12px;
      color: #6b7280;
      text-align: center;
    }
    .week-view .day-header {
      border-bottom: 1px solid #e5e7eb;
      padding: 8px;
      font-weight: 600;
      text-align: center;
      background: #f9fafb;
    }
    .week-view .time-slot {
      border-right: 1px solid #e5e7eb;
      border-bottom: 1px solid #f3f4f6;
      position: relative;
      min-height: 40px;
    }
    .week-view .time-slot:hover {
      background: #f8fafc;
    }
    /* Overlay layer spanning the grid to align events with day columns */
    .events-layer {
      position: absolute;
      inset: 0;
      display: grid;
      grid-template-columns: 60px repeat(7, 1fr);
      /* Force a single row so all overlay children share the same vertical origin */
      grid-template-rows: 1fr;
      pointer-events: none; /* Let empty space clicks reach slots */
    }
    .event-wrapper,
    .indicator-wrapper {
      position: relative;
      /* Place all wrappers in the first (only) grid row to avoid stacking */
      grid-row: 1;
      pointer-events: none;
    }
    .event {
      position: absolute;
      left: 2px;
      right: 2px;
      box-sizing: border-box;
      background: #3b82f6;
      color: white;
      padding: 2px 4px;
      border-radius: 3px;
      font-size: 12px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      cursor: pointer;
      z-index: 10;
      pointer-events: auto; /* clickable over the overlay */
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

  @property({ type: String, reflect: true }) view: ViewMode = "week";
  @property({ type: String, reflect: true, attribute: "mode" }) uiMode: UIMode =
    "public";
  @property({ type: String, reflect: true, attribute: "teacher-id" })
  teacherId?: string;
  @property({ type: String, reflect: true }) timezone: string =
    Intl.DateTimeFormat().resolvedOptions().timeZone;
  @property({ type: Number, reflect: true, attribute: "slot-duration" })
  slotDuration: number = 30;
  @property({ type: Number, reflect: true, attribute: "snap-to" })
  snapTo: number = 15;
  @property({ type: Boolean, reflect: true, attribute: "show-classes" })
  showClasses: boolean = true;
  @property({ type: Boolean, reflect: true, attribute: "show-bookings" })
  showBookings: boolean = true;

  @state() private _events: CalendarEvent[] = [];
  @state() private currentDate: Date = new Date();
  @state() private selectedDate: Date = new Date();
  // Optional ISO date (YYYY-MM-DD or full ISO) to set the starting date
  @property({ type: String, reflect: true }) date?: string;
  // Public property to pass events in via JS (not via attribute)
  @property({ attribute: false }) events: CalendarEvent[] = [];
  // Optional JSON attribute for events: <thrive-calendar events-json='[...]'>
  @property({ type: String, attribute: "events-json" }) eventsJson?: string;
  // Styling props mapped to CSS variables for quick theming
  @property({ type: String, attribute: "event-class-bg" })
  eventClassBg?: string;
  @property({ type: String, attribute: "event-class-fg" })
  eventClassFg?: string;
  @property({ type: String, attribute: "event-booking-bg" })
  eventBookingBg?: string;
  @property({ type: String, attribute: "event-booking-fg" })
  eventBookingFg?: string;
  @property({ type: String, attribute: "event-radius" }) eventRadius?: string;

  private emit<T extends object>(name: string, detail: T) {
    this.dispatchEvent(
      new CustomEvent(name, { detail, bubbles: true, composed: true })
    );
  }

  connectedCallback() {
    super.connectedCallback();
  }

  protected updated(changed: Map<string | number | symbol, unknown>): void {
    // Sync current date from 'date' input
    if (changed.has("date")) {
      if (this.date) {
        const parsed = new Date(this.date);
        if (!isNaN(parsed.getTime())) {
          this.currentDate = parsed;
          this.selectedDate = parsed;
        }
      }
    }
    // Sync from events-json attribute
    if (changed.has("eventsJson")) {
      try {
        if (this.eventsJson) {
          const parsed = JSON.parse(this.eventsJson) as CalendarEvent[];
          this._events = Array.isArray(parsed) ? parsed : [];
        } else {
          // leave as-is if eventsJson removed
        }
      } catch {
        // ignore invalid JSON
      }
    }
    // Sync from public events prop
    if (changed.has("events")) {
      if (Array.isArray(this.events)) {
        this._events = this.events;
      }
    }

    // Map styling props to CSS variables on host
    const setVar = (k: string, v?: string) => {
      if (typeof v === "string" && v.length) this.style.setProperty(k, v);
    };
    if (changed.has("eventClassBg"))
      setVar("--thrive-cal-event-class-bg", this.eventClassBg);
    if (changed.has("eventClassFg"))
      setVar("--thrive-cal-event-class-fg", this.eventClassFg);
    if (changed.has("eventBookingBg"))
      setVar("--thrive-cal-event-booking-bg", this.eventBookingBg);
    if (changed.has("eventBookingFg"))
      setVar("--thrive-cal-event-booking-fg", this.eventBookingFg);
    if (changed.has("eventRadius"))
      setVar("--thrive-cal-event-radius", this.eventRadius);
  }

  private navigateDate(direction: "prev" | "next") {
    const newDate = new Date(this.currentDate);
    const days = this.view === "week" ? 7 : this.view === "day" ? 1 : 30;
    newDate.setDate(newDate.getDate() + (direction === "next" ? days : -days));
    this.currentDate = newDate;
    this.selectedDate = newDate;
  }

  private setView(newView: ViewMode) {
    this.view = newView;
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
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  private getEventPosition(event: CalendarEvent): {
    top: number;
    height: number;
    dayIndex: number;
  } {
    // Compute position robustly using minutes since local midnight
    const start = new Date(event.startUtc);
    const end = new Date(event.endUtc);
    const weekDates = this.getWeekDates(this.currentDate);

    const dayIndex = weekDates.findIndex(
      (d) => d.toDateString() === start.toDateString()
    );

    // If the event isn’t in the visible week, signal to skip it
    if (dayIndex === -1) return { top: 0, height: 0, dayIndex: -1 };

    // Minutes since local midnight for the event's start
    const startOfDay = new Date(start);
    startOfDay.setHours(0, 0, 0, 0);
    const minutesFromStart = Math.max(
      0,
      Math.min(
        24 * 60,
        Math.round((start.getTime() - startOfDay.getTime()) / 60000)
      )
    );

    // Duration in minutes (ensure non-negative)
    const durationMinutes = Math.max(
      0,
      Math.round((end.getTime() - start.getTime()) / 60000)
    );

    // Map minutes to pixels (40px per hour -> 2/3 px per minute)
    const pxPerMinute = 40 / 60;
    const top = minutesFromStart * pxPerMinute; // relative to the start of the time grid (excludes header)

    // Clamp height so the event doesn't overflow past the end of the day grid
    const dayHeight = 24 * 40; // px
    const heightRaw = durationMinutes * pxPerMinute;
    const height = Math.max(2, Math.min(heightRaw, dayHeight - top));

    return { top, height, dayIndex };
  }

  private onEventClick(event: CalendarEvent) {
    this.emit("event:click", { event });
  }

  private onSlotClick(hour: number, dayIndex: number) {
    const weekDates = this.getWeekDates(this.currentDate);
    const clickedDate = new Date(weekDates[dayIndex]);
    clickedDate.setHours(hour, 0, 0, 0);

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
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return html`
      <div class="week-view">
        <!-- Header row -->
        <div></div>
        ${weekDates.map(
          (date) => html`
            <div class="day-header">${this.formatDate(date)}</div>
          `
        )}

        <!-- Time slots -->
        ${hours.map(
          (hour) => html`
            <div class="time-label">
              ${this.formatTime(new Date(0, 0, 0, hour))}
            </div>
            ${weekDates.map(
              (_, dayIndex) => html`
                <div
                  class="time-slot"
                  @click=${() => this.onSlotClick(hour, dayIndex)}
                ></div>
              `
            )}
          `
        )}

        <!-- Overlay for events and indicators -->
        <div
          class="events-layer"
          style="position:absolute;inset:0;display:grid;grid-template-columns:60px repeat(7,1fr);pointer-events:none;"
        >
          ${this._events
            .filter(
              (ev) =>
                ((this.showClasses && ev.type === "class") ||
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
                    style="top: ${top + 40}px; height: ${height}px;"
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
    // Compute top in px (40 header + 40px per hour) and clamp to grid height
    const rawTop = (minutes / 60) * 40 + 40;
    const maxTop = 40 + 24 * 40;
    const top = Math.max(40, Math.min(rawTop, maxTop - 1));

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
      <div class="toolbar" role="toolbar" aria-label="Calendar toolbar">
        <div class="nav-buttons">
          <button @click=${() => this.navigateDate("prev")}>←</button>
          <button @click=${() => this.navigateDate("next")}>→</button>
          <span style="margin-left: 8px; font-weight: 600;">
            ${this.currentDate.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>

        <div class="view-buttons">
          <button
            class=${this.view === "week" ? "active" : ""}
            @click=${() => this.setView("week")}
          >
            Week
          </button>
          <button
            class=${this.view === "day" ? "active" : ""}
            @click=${() => this.setView("day")}
          >
            Day
          </button>
          <button
            class=${this.view === "month" ? "active" : ""}
            @click=${() => this.setView("month")}
          >
            Month
          </button>
          <button
            class=${this.view === "list" ? "active" : ""}
            @click=${() => this.setView("list")}
          >
            List
          </button>
        </div>

        <div>
          <span style="color:#94a3b8">${this.uiMode} • ${this.timezone}</span>
        </div>
      </div>

      <div class="grid" role="grid" aria-label="Calendar grid">
        ${this.view === "week"
          ? this.renderWeekView()
          : html`<div>View ${this.view} not implemented yet</div>`}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "thrive-calendar": ThriveCalendar;
  }
}
