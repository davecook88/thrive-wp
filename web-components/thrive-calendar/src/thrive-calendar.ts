import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";

export type ViewMode = "week" | "day" | "month" | "list";
export type UIMode = "admin" | "teacher" | "student" | "public";

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
    .grid {
      border: 1px solid #e5e7eb;
      border-top: none;
      border-radius: 0 0 8px 8px;
      min-height: 360px;
      background: var(--thrive-cal-bg, #fff);
      display: grid;
      place-items: center;
      color: #64748b;
    }
  `;

  @property({ type: String, reflect: true }) view: ViewMode = "week";
  @property({ type: String, reflect: true, attribute: "mode" }) uiMode: UIMode =
    "public";
  @property({ type: String, reflect: true, attribute: "teacher-id" })
  teacherId?: string;
  @property({ type: String, reflect: true }) timezone: string =
    Intl.DateTimeFormat().resolvedOptions().timeZone;

  @state() private now = new Date();

  private emit<T extends object>(name: string, detail: T) {
    this.dispatchEvent(
      new CustomEvent(name, { detail, bubbles: true, composed: true })
    );
  }

  private onSelectMock() {
    const startUtc = new Date().toISOString();
    const endUtc = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    this.emit("slot:select", { startUtc, endUtc, teacherId: this.teacherId });
  }

  render() {
    return html`
      <div class="toolbar" role="toolbar" aria-label="Calendar toolbar">
        <div>
          <strong>${this.view.toUpperCase()}</strong>
          <span style="color:#94a3b8">
            • ${this.uiMode} • ${this.timezone}</span
          >
        </div>
        <button part="primary-button" @click=${this.onSelectMock}>
          Select 30m Slot (demo)
        </button>
      </div>
      <div class="grid" role="grid" aria-label="Calendar grid">
        <div>
          Calendar ${this.view} view placeholder — implement virtualization
          next.
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "thrive-calendar": ThriveCalendar;
  }
}
