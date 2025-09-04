import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { ViewMode, UIMode, CalendarEvent } from "./types.js";

import "./components/toolbar.ts";
import "./components/week-view.ts";

@customElement("thrive-calendar")
export class ThriveCalendar extends LitElement {
  static styles = css`
    :host {
      display: block;
      font: normal 14px/1.5 system-ui, -apple-system, Segoe UI, Roboto, Ubuntu,
        Cantarell, Noto Sans, Arial, "Apple Color Emoji", "Segoe UI Emoji";
      color: var(--thrive-cal-fg, #0f172a);
      /* Customizable rhythm and palette */
      --thrive-cal-header-height: var(--thrive-header-height, 40px);
      --thrive-cal-hour-height: var(--thrive-hour-height, 40px);
      --thrive-cal-radius: var(--thrive-radius, 10px);
      --thrive-grid-line-major: var(--thrive-grid-line-major, #e6eef6);
      --thrive-grid-line-minor: var(--thrive-grid-line-minor, #f1f5f9);
      --thrive-toolbar-bg: var(--thrive-toolbar-bg, transparent);
      --thrive-cal-header-bg: var(--thrive-header-bg, transparent);
      --thrive-heading-fg: var(--thrive-heading-fg, #0f172a);
      --thrive-muted-fg: var(--thrive-muted-fg, #64748b);
      --thrive-today-bg: var(--thrive-today-bg, #f8fafc);
      --thrive-today-fg: var(--thrive-today-fg, #4338ca);
      --thrive-slot-hover: var(--thrive-slot-hover, #f8fafc);
      --thrive-availability-bg: var(--thrive-availability-bg, #f0fdf4);
      --thrive-availability-fg: var(--thrive-availability-fg, #065f46);
      --thrive-blackout-bg: var(--thrive-blackout-bg, #efefef);
      --thrive-blackout-stripe: var(--thrive-blackout-stripe, #f7f7f7);
      --thrive-accent: var(--thrive-accent, #9aa8ff);
    }
  `;

  @property({ type: String, reflect: true }) view: ViewMode = "week";
  @property({ type: String, reflect: true, attribute: "mode" }) uiMode: UIMode =
    "public";
  @property({ type: String, reflect: true, attribute: "teacher-id" })
  teacherId?: string;
  @property({ type: String, reflect: true }) timezone: string =
    Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
  @property({ type: Number, reflect: true, attribute: "slot-duration" })
  slotDuration: number = 30;
  @property({ type: Number, reflect: true, attribute: "snap-to" })
  snapTo: number = 15;
  // Start/End of visible day (hours 0-24)
  @property({ type: Number, reflect: true, attribute: "start-hour" })
  startHour: number = 0;
  @property({ type: Number, reflect: true, attribute: "end-hour" })
  endHour: number = 24;
  // 12h vs 24h labels
  @property({ type: String, reflect: true, attribute: "time-format" })
  timeFormat: "12h" | "24h" = "12h";
  // Heights to customize grid rhythm
  @property({ type: Number, reflect: true, attribute: "hour-height" })
  hourHeight: number = 40;
  @property({ type: Number, reflect: true, attribute: "header-height" })
  headerHeight: number = 40;
  @property({ type: Boolean, reflect: true, attribute: "show-classes" })
  showClasses: boolean = true;
  @property({ type: Boolean, reflect: true, attribute: "show-bookings" })
  showBookings: boolean = true;
  @property({ type: Boolean, reflect: true, attribute: "show-timezone" })
  showTimezone: boolean = true;

  @state() private _events: CalendarEvent[] = [];
  @state() private currentDate: Date = new Date();
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
  @property({ type: String, attribute: "availability-bg" })
  availabilityBg?: string;
  @property({ type: String, attribute: "availability-fg" })
  availabilityFg?: string;
  @property({ type: String, attribute: "blackout-bg" }) blackoutBg?: string;
  @property({ type: String, attribute: "blackout-stripe" })
  blackoutStripe?: string;
  @property({ type: Number, attribute: "view-height" })
  viewHeight: number = 600;

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
    if (changed.has("hourHeight"))
      setVar("--thrive-hour-height", `${this.hourHeight}px`);
    if (changed.has("headerHeight"))
      setVar("--thrive-header-height", `${this.headerHeight}px`);
    if (changed.has("availabilityBg"))
      setVar("--thrive-availability-bg", this.availabilityBg);
    if (changed.has("availabilityFg"))
      setVar("--thrive-availability-fg", this.availabilityFg);
    if (changed.has("blackoutBg"))
      setVar("--thrive-blackout-bg", this.blackoutBg);
    if (changed.has("blackoutStripe"))
      setVar("--thrive-blackout-stripe", this.blackoutStripe);

    // Notify consumers when the visible date range may have changed
    if (
      changed.has("currentDate") ||
      changed.has("view") ||
      changed.has("timezone")
    ) {
      this.emit("range:change", {
        fromDate: this.fromDate,
        untilDate: this.untilDate,
        timezone: this.timezone,
        view: this.view,
      });
    }
  }

  private navigateDate(direction: "prev" | "next") {
    const newDate = new Date(this.currentDate);
    const days = this.view === "week" ? 7 : this.view === "day" ? 1 : 30;
    newDate.setDate(newDate.getDate() + (direction === "next" ? days : -days));
    this.currentDate = newDate;
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

  // ===== Public date-range exposure (timezone-aware YYYY-MM-DD) =====
  // Format a stable YYYY-MM-DD in the configured timezone
  private zonedDateKey(date: Date): string {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: this.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }

  // Map to Sunday=0 … Saturday=6 in the configured timezone
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

  // Compute week dates with week starting on Sunday using the configured timezone
  private getWeekDatesZoned(date: Date): Date[] {
    const start = new Date(date);
    const dow = this.zonedDowIndex(date);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - dow);
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  }

  // Month range (first/last day) in configured timezone
  private getMonthRangeZoned(date: Date): { start: Date; end: Date } {
    const year = Number(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: this.timezone,
        year: "numeric",
      }).format(date)
    );
    const month = Number(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: this.timezone,
        month: "2-digit",
      }).format(date)
    );
    // Construct via local Date, then we only use YYYY-MM-DD keys so absolute time isn't critical here
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0); // last day of month
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return { start, end };
  }

  // Public read-only properties: UTC ISO strings marking range
  // fromDate => inclusive start (T00:00:00.000Z)
  // untilDate => exclusive end (T00:00:00.000Z of the day AFTER the last visible day)
  get fromDate(): string {
    // Determine the first visible calendar day in configured timezone
    let firstDay: Date;
    if (this.view === "week") {
      const week = this.getWeekDatesZoned(this.currentDate);
      firstDay = week[0];
    } else if (this.view === "day") {
      firstDay = new Date(this.currentDate);
    } else if (this.view === "month") {
      firstDay = this.getMonthRangeZoned(this.currentDate).start;
    } else {
      firstDay = this.getWeekDatesZoned(this.currentDate)[0];
    }
    const ymd = this.zonedDateKey(firstDay); // YYYY-MM-DD in view timezone
    // Interpret that calendar date as UTC midnight
    return new Date(`${ymd}T00:00:00.000Z`).toISOString();
  }

  get untilDate(): string {
    // Determine the day AFTER the last visible calendar day
    let lastDayPlusOne: Date;
    if (this.view === "week") {
      const week = this.getWeekDatesZoned(this.currentDate);
      const last = new Date(week[6]);
      last.setDate(last.getDate() + 1);
      lastDayPlusOne = last;
    } else if (this.view === "day") {
      const d = new Date(this.currentDate);
      d.setDate(d.getDate() + 1);
      lastDayPlusOne = d;
    } else if (this.view === "month") {
      const { end } = this.getMonthRangeZoned(this.currentDate); // last day of month
      const d = new Date(end);
      d.setDate(d.getDate() + 1); // first day of next month
      lastDayPlusOne = d;
    } else {
      const week = this.getWeekDatesZoned(this.currentDate);
      const last = new Date(week[6]);
      last.setDate(last.getDate() + 1);
      lastDayPlusOne = last;
    }
    const ymd = this.zonedDateKey(lastDayPlusOne); // YYYY-MM-DD in view timezone
    return new Date(`${ymd}T00:00:00.000Z`).toISOString();
  }

  // Note: event positioning is handled by <thrive-week-view> which is
  // timezone-aware and reads CSS variables for exact pixel alignment.

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

  private handleToday() {
    this.currentDate = new Date();
  }

  private handleNavigate(e: CustomEvent<{ direction: "prev" | "next" }>) {
    this.navigateDate(e.detail.direction);
  }

  private handleSetView(e: CustomEvent<{ view: ViewMode }>) {
    this.setView(e.detail.view);
  }

  render() {
    return html`
      <thrive-toolbar
        .view=${this.view}
        .uiMode=${this.uiMode}
        .timezone=${this.timezone}
        .currentDate=${this.currentDate}
        @today=${this.handleToday}
        @navigate=${this.handleNavigate}
        @set-view=${this.handleSetView}
      ></thrive-toolbar>

      ${this.view === "week"
        ? html`<thrive-week-view
            .events=${this._events}
            .currentDate=${this.currentDate}
            .startHour=${this.startHour}
            .endHour=${this.endHour}
            .hourHeight=${this.hourHeight}
            .headerHeight=${this.headerHeight}
            .slotDuration=${this.slotDuration}
            .showClasses=${this.showClasses}
            .showBookings=${this.showBookings}
            .timeFormat=${this.timeFormat}
            .showTimezone=${this.showTimezone}
            .timezone=${this.timezone}
            .viewHeight=${this.viewHeight}
            @event:click=${this.onEventClick}
            @slot:select=${this.onSlotClick}
          ></thrive-week-view>`
        : html`<div>View ${this.view} not implemented yet</div>`}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "thrive-calendar": ThriveCalendar;
  }
}
