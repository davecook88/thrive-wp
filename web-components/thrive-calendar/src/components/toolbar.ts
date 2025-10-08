import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("thrive-toolbar")
export class ThriveToolbar extends LitElement {
  static styles = css`
    .toolbar {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 16px;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid var(--thrive-grid-line-major, #e5e7eb);
      border-radius: var(--thrive-cal-radius, 12px)
        var(--thrive-cal-radius, 12px) 0 0;
      background: var(--thrive-toolbar-bg, transparent);
      color: var(--thrive-muted-fg, #6b7280);
    }
    .toolbar .nav-buttons {
      display: flex;
      gap: 12px;
      align-items: center;
      justify-content: center;
    }
    .toolbar .center-info {
      text-align: center;
    }
    .toolbar button {
      padding: 8px 14px;
      border: 1px solid transparent;
      border-radius: 12px;
      background: transparent;
      color: var(--thrive-muted-fg, #6b7280);
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.2s ease;
    }
    .toolbar button:hover {
      background: var(--thrive-hover-bg, #f9fafb);
      border-color: var(--thrive-grid-line-major, #e5e7eb);
      transform: translateY(-1px);
    }
    .toolbar .view-buttons {
      display: flex;
      gap: 8px;
    }
    .toolbar .view-buttons button.active {
      background: var(--thrive-accent, #ff5722);
      color: white;
      border-color: var(--thrive-accent, #ff5722);
    }
    .toolbar .nav-buttons span {
      font-weight: 700;
      font-size: 15px;
      color: var(--thrive-heading-fg, #111827);
      text-align: center;
      letter-spacing: 0;
    }
    .toolbar button.today {
      background: var(--thrive-today-bg, #fff7ed);
      color: var(--thrive-today-fg, #ff5722);
      border-color: transparent;
      font-weight: 600;
      width: max-content;
    }
    .toolbar button.today:hover {
      background: #ffedd5;
      box-shadow: 0 2px 4px rgba(255, 87, 34, 0.1);
    }
  `;

  @property({ type: String }) view: string = "week";
  @property({ type: String }) uiMode: string = "public";
  @property({ type: String }) timezone: string = "UTC";
  @property({ type: Object }) currentDate: Date = new Date();

  private emit(name: string, detail?: any) {
    this.dispatchEvent(
      new CustomEvent(name, { detail, bubbles: true, composed: true })
    );
  }

  private handleToday() {
    this.emit("today");
  }

  private handleNavigate(direction: "prev" | "next") {
    this.emit("navigate", { direction });
  }

  private handleSetView(newView: string) {
    this.emit("set-view", { view: newView });
  }

  private getWeekDates(date: Date): Date[] {
    const zoned = this.toZoned(date);
    const startOfWeek = new Date(zoned);
    const day = startOfWeek.getDay();
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(startOfWeek.getDate() - day);

    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      dates.push(d);
    }
    return dates;
  }

  private toZoned(date: Date): Date {
    return new Date(date.toLocaleString("en-US", { timeZone: this.timezone }));
  }

  private formatWeekRangeLabel(anchor: Date): string {
    const week = this.getWeekDates(anchor);
    const start = week[0];
    const end = week[6];
    const startStr = start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: this.timezone,
    });
    const endStr = end.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: start.getFullYear() === end.getFullYear() ? undefined : "numeric",
      timeZone: this.timezone,
    });
    return `${startStr} - ${endStr}`;
  }

  render() {
    return html`
      <div class="toolbar" role="toolbar" aria-label="Calendar toolbar">
        <button class="today" @click=${this.handleToday}>📅 Today</button>

        <div class="nav-buttons">
          <button @click=${() => this.handleNavigate("prev")} title="Previous">
            ←
          </button>
          <span style="margin-left: 8px; font-weight: 700;">
            ${this.formatWeekRangeLabel(this.currentDate)}
          </span>
          <button @click=${() => this.handleNavigate("next")} title="Next">
            →
          </button>
        </div>
        <!-- Navigation buttons  
        <div class="view-buttons">
          <button
            class=${this.view === "week" ? "active" : ""}
            @click=${() => this.handleSetView("week")}
          >
            Week
          </button>
          <button
            class=${this.view === "day" ? "active" : ""}
            @click=${() => this.handleSetView("day")}
          >
            Day
          </button>
          <button
            class=${this.view === "month" ? "active" : ""}
            @click=${() => this.handleSetView("month")}
          >
            Month
          </button>
          <button
            class=${this.view === "list" ? "active" : ""}
            @click=${() => this.handleSetView("list")}
          >
            List
          </button>
        </div>
        -->

        <div class="center-info"></div>
      </div>
    `;
  }
}
