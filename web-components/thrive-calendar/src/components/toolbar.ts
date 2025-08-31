import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("thrive-toolbar")
export class ThriveToolbar extends LitElement {
  static styles = css`
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 12px;
      border: var(--thrive-cal-border);
      border-radius: var(--thrive-cal-radius) var(--thrive-cal-radius) 0 0;
      background: var(--thrive-cal-toolbar-bg);
    }
    .toolbar .nav-buttons {
      display: flex;
      gap: 4px;
    }
    .toolbar button {
      padding: 4px 8px;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      background: white;
      cursor: pointer;
    }
    .toolbar button:hover {
      background: #f5f7fa;
    }
    .toolbar .view-buttons {
      display: flex;
      gap: 2px;
    }
    .toolbar .view-buttons button.active {
      background: #111827;
      color: white;
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

  private formatWeekRangeLabel(anchor: Date): string {
    const week = this.getWeekDates(anchor);
    const start = week[0];
    const end = week[6];
    const startStr = start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const endStr = end.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: start.getFullYear() === end.getFullYear() ? undefined : "numeric",
    });
    return `${startStr} - ${endStr}`;
  }

  render() {
    return html`
      <div class="toolbar" role="toolbar" aria-label="Calendar toolbar">
        <div class="nav-buttons">
          <button class="today" @click=${this.handleToday}>📅 Today</button>
          <span style="margin-left: 8px; font-weight: 700;">
            ${this.formatWeekRangeLabel(this.currentDate)}
          </span>
        </div>

        <div class="nav-buttons">
          <button @click=${() => this.handleNavigate("prev")} title="Previous">
            ←
          </button>
          <button @click=${() => this.handleNavigate("next")} title="Next">
            →
          </button>
        </div>

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

        <div>
          <span style="color:#94a3b8">${this.uiMode} • ${this.timezone}</span>
        </div>
      </div>
    `;
  }
}
