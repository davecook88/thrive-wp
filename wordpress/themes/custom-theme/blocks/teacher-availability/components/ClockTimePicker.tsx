import { useEffect, useMemo, useRef, useState } from "@wordpress/element";
import { Button, Popover } from "@wordpress/components";

type Mode = "hour" | "minute";

export interface ClockTimePickerProps {
  label?: string;
  value: number; // minutes from midnight
  onChange: (minutes: number) => void;
  accentColor?: string;
  is12Hour?: boolean; // default true (AM/PM)
  className?: string;
}

/**
 * A lightweight, dependency-free clock time picker inspired by MUI's ClockPicker.
 * - Click the field to open a popover with an analog dial
 * - Pick hour first, then minutes (5-min increments)
 * - OK applies the change, Cancel reverts
 */
export default function ClockTimePicker({
  label,
  value,
  onChange,
  accentColor = "#60a5fa",
  is12Hour = true,
  className,
}: ClockTimePickerProps) {
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("hour");

  // temp state while picker is open
  const [tempHour, setTempHour] = useState<number>(0); // 0-23
  const [tempMinute, setTempMinute] = useState<number>(0); // 0-59
  const [ampm, setAmpm] = useState<"AM" | "PM">("AM");

  const parsed = useMemo(() => decomposeMinutes(value), [value]);

  useEffect(() => {
    if (open) {
      setMode("hour");
      setTempHour(parsed.hour24);
      setTempMinute(parsed.minute);
      setAmpm(parsed.hour24 >= 12 ? "PM" : "AM");
    }
  }, [open, parsed.hour24, parsed.minute]);

  const displayValue = useMemo(() => {
    return formatTime(value, is12Hour);
  }, [value, is12Hour]);

  const currentPreview = useMemo(() => {
    const previewMinutes = is12Hour
      ? composeMinutes(to24Hour(tempHour, ampm === "PM"), tempMinute)
      : composeMinutes(tempHour, tempMinute);
    return formatTime(previewMinutes, is12Hour);
  }, [tempHour, tempMinute, ampm, is12Hour]);

  const handleOk = () => {
    const minutes = is12Hour
      ? composeMinutes(to24Hour(tempHour, ampm === "PM"), tempMinute)
      : composeMinutes(tempHour, tempMinute);
    onChange(minutes);
    setOpen(false);
  };

  const handleCancel = () => setOpen(false);

  return (
    <div className={className} style={{ display: "inline-block" }}>
      {label && (
        <div style={{ marginBottom: 6, fontSize: 12, color: "#374151" }}>
          {label}
        </div>
      )}
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen(true)}
        style={inputButtonStyle}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span>{displayValue}</span>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#6b7280"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 7 12 12 15 13" />
        </svg>
      </button>

      {open && (
        <Popover
          anchorRef={anchorRef.current as HTMLElement}
          onClose={() => setOpen(false)}
          focusOnMount="firstElement"
          placement="bottom-start"
          className="thrive-clock-popover"
          style={{ zIndex: 999999 }}
        >
          {/* Popover chrome reset */}
          <style>
            {`
              .thrive-clock-popover.components-popover,
              .thrive-clock-popover .components-popover__content {
                background: transparent !important;
                box-shadow: none !important;
                border: 0 !important;
                padding: 0 !important;
              }

              /* Hover polish */
              .thrive-clock-popover .thrive-clock-surface button.thrive-dial-btn:hover {
                transform: scale(1.06);
                background: var(--thrive-accent, #60a5fa) !important;
                color: #fff !important;
              }
            `}
          </style>
          <div
            className="thrive-clock-surface"
            style={{
              ...containerStyle,
              ["--thrive-accent" as any]: accentColor,
            }}
            role="dialog"
            aria-label="Time picker"
          >
            {/* Header */}
            <div style={headerStyle}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  onClick={() => setMode("hour")}
                  style={{
                    ...segmentStyle,
                    color: mode === "hour" ? "white" : "#111827",
                    background: mode === "hour" ? accentColor : "#e5e7eb",
                  }}
                >
                  {two(tempHour % (is12Hour ? 12 : 24)) ||
                    (is12Hour ? "12" : "00")}
                </button>
                <span style={{ fontWeight: 600, color: "#111827" }}>:</span>
                <button
                  onClick={() => setMode("minute")}
                  style={{
                    ...segmentStyle,
                    color: mode === "minute" ? "white" : "#111827",
                    background: mode === "minute" ? accentColor : "#e5e7eb",
                  }}
                >
                  {two(tempMinute)}
                </button>
                {is12Hour && (
                  <div style={{ display: "flex", gap: 6, marginLeft: 6 }}>
                    {(["AM", "PM"] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setAmpm(p)}
                        style={{
                          ...ampmStyle,
                          background: ampm === p ? accentColor : "#e5e7eb",
                          color: ampm === p ? "white" : "#111827",
                        }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ color: "#6b7280", fontSize: 12 }}>
                Preview: {currentPreview}
              </div>
            </div>

            {/* Clock */}
            <AnalogClock
              accentColor={accentColor}
              mode={mode}
              hour={is12Hour ? to12Hour(tempHour) : tempHour}
              minute={tempMinute}
              onHourSelect={(h) => {
                // h is 1..12 in 12h mode, else 0..23
                if (is12Hour) {
                  const h24 = from12To24(h, ampm);
                  setTempHour(h24);
                } else {
                  setTempHour(h);
                }
                setMode("minute");
              }}
              onMinuteSelect={(m) => {
                setTempMinute(m);
                // confirm immediately on minute click
                const finalMinutes = is12Hour
                  ? composeMinutes(from12To24(to12Hour(tempHour), ampm), m)
                  : composeMinutes(tempHour, m);
                onChange(finalMinutes);
                setOpen(false);
              }}
              onHourHover={(h) => {
                if (is12Hour) {
                  setTempHour(from12To24(h, ampm));
                } else {
                  setTempHour(h);
                }
              }}
              onMinuteHover={(m) => setTempMinute(m)}
            />

            {/* Footer */}
            <div style={footerStyle}>
              <Button variant="secondary" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleOk}
                style={{ background: accentColor }}
              >
                OK
              </Button>
            </div>
          </div>
        </Popover>
      )}
    </div>
  );
}

// ---------- Analog clock sub-component ----------
interface AnalogClockProps {
  mode: Mode;
  hour: number; // when is12Hour: 1..12; else 0..23
  minute: number; // 0..59
  accentColor: string;
  onHourSelect: (h: number) => void;
  onMinuteSelect: (m: number) => void;
  onHourHover?: (h: number) => void;
  onMinuteHover?: (m: number) => void;
}

function AnalogClock({
  mode,
  hour,
  minute,
  accentColor,
  onHourSelect,
  onMinuteSelect,
  onHourHover,
  onMinuteHover,
}: AnalogClockProps) {
  const size = 260;
  const center = size / 2;
  const outer = center - 18;
  const hand = outer - 42;

  const hourLabels = useMemo(
    () => Array.from({ length: 12 }, (_, i) => i + 1),
    []
  );
  const minuteLabels = useMemo(
    () => Array.from({ length: 12 }, (_, i) => i * 5),
    []
  );

  const activeAngle =
    mode === "hour"
      ? angleForIndex(hour % 12 || 12, 12)
      : angleForIndex(minute, 60);

  const handLen = mode === "hour" ? hand : hand + 10;

  return (
    <div style={{ width: size, height: size, position: "relative" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={center}
          cy={center}
          r={outer}
          fill="#0f172a"
          opacity={0.9}
        />
        {/* ticks */}
        {Array.from({ length: 60 }, (_, i) => {
          const ang = (Math.PI * 2 * i) / 60 - Math.PI / 2;
          const isMajor = i % 5 === 0;
          const r1 = outer - (isMajor ? 10 : 6);
          const r2 = outer - (isMajor ? 2 : 0);
          const x1 = center + r1 * Math.cos(ang);
          const y1 = center + r1 * Math.sin(ang);
          const x2 = center + r2 * Math.cos(ang);
          const y2 = center + r2 * Math.sin(ang);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={isMajor ? "#94a3b8" : "#1f2937"}
              strokeWidth={isMajor ? 2 : 1}
            />
          );
        })}

        {/* hand */}
        <line
          x1={center}
          y1={center}
          x2={center + handLen * Math.cos(activeAngle)}
          y2={center + handLen * Math.sin(activeAngle)}
          stroke={accentColor}
          strokeWidth={4}
          strokeLinecap="round"
        />
        <circle cx={center} cy={center} r={6} fill={accentColor} />
      </svg>

      {/* Labels as clickable buttons */}
      {mode === "hour"
        ? hourLabels.map((h) => (
            <DialButton
              key={h}
              label={`${h}`}
              selected={(hour % 12 || 12) === h}
              onClick={() => onHourSelect(h)}
              onHover={() => onHourHover?.(h)}
              center={center}
              radius={outer - 34}
              index={h}
              total={12}
              accentColor={accentColor}
            />
          ))
        : minuteLabels.map((m) => (
            <DialButton
              key={m}
              label={two(m)}
              selected={Math.round(minute / 5) * 5 === m}
              onClick={() => onMinuteSelect(m)}
              onHover={() => onMinuteHover?.(m)}
              center={center}
              radius={outer - 34}
              index={m}
              total={60}
              accentColor={accentColor}
            />
          ))}
    </div>
  );
}

interface DialButtonProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  onHover?: () => void;
  center: number;
  radius: number;
  // for placement on the circle
  index: number; // hour (1..12) or minute (0..59)
  total: number; // 12 or 60
  accentColor: string;
}

function DialButton({
  label,
  selected,
  onClick,
  onHover,
  center,
  radius,
  index,
  total,
  accentColor,
}: DialButtonProps) {
  const angle =
    total === 12
      ? angleForIndex(index, total)
      : (Math.PI * 2 * index) / total - Math.PI / 2;
  const x = center + radius * Math.cos(angle);
  const y = center + radius * Math.sin(angle);
  const base = {
    position: "absolute" as const,
    left: x - 18,
    top: y - 18,
    width: 36,
    height: 36,
    borderRadius: 999,
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: selected ? accentColor : "#111827cc",
    color: selected ? "white" : "#e5e7eb",
    fontWeight: 600,
    transition: "transform 120ms ease, background 120ms ease, color 120ms ease",
    boxShadow: selected ? `0 0 0 2px ${accentColor}55` : "none",
  } as const;
  return (
    <button
      className="thrive-dial-btn"
      type="button"
      onClick={onClick}
      onMouseEnter={onHover}
      style={base}
      onFocus={onHover}
      onMouseOver={onHover}
      onKeyUp={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
    >
      {label}
    </button>
  );
}

// ---------- utils & styles ----------
function two(n: number): string {
  return n.toString().padStart(2, "0");
}

function formatTime(totalMinutes: number, is12: boolean): string {
  const { hour24, minute } = decomposeMinutes(totalMinutes);
  if (!is12) return `${two(hour24)}:${two(minute)}`;
  const { hour12, period } = to12HourWithPeriod(hour24);
  return `${two(hour12)}:${two(minute)} ${period}`;
}

function decomposeMinutes(totalMinutes: number): {
  hour24: number;
  minute: number;
} {
  const m = Math.max(0, Math.min(24 * 60 - 1, Math.floor(totalMinutes)));
  const hour24 = Math.floor(m / 60);
  const minute = m % 60;
  return { hour24, minute };
}

function composeMinutes(hour24: number, minute: number): number {
  const h = Math.max(0, Math.min(23, hour24));
  const m = Math.max(0, Math.min(59, minute));
  return h * 60 + m;
}

function to12Hour(h24: number): number {
  const h = h24 % 24;
  const v = h % 12;
  return v === 0 ? 12 : v;
}

function to12HourWithPeriod(h24: number): {
  hour12: number;
  period: "AM" | "PM";
} {
  const hour12 = to12Hour(h24);
  const period: "AM" | "PM" = h24 >= 12 ? "PM" : "AM";
  return { hour12, period };
}

function from12To24(hour12: number, p: "AM" | "PM"): number {
  const h = hour12 % 12;
  return p === "PM" ? h + 12 : h;
}

function to24Hour(currentHour24: number, pm: boolean): number {
  const base = currentHour24 % 12; // 0..11
  return pm ? base + 12 : base;
}

function angleForIndex(i: number, total: number): number {
  // i is 1..total when total=12; else any 0..total-1
  const index = total === 12 ? i : i % total;
  return (Math.PI * 2 * index) / total - Math.PI / 2;
}

const inputButtonStyle: React.CSSProperties = {
  width: 160,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  padding: "8px 10px",
  border: "1px solid #e5e7eb",
  borderRadius: 6,
  background: "white",
  color: "#111827",
  cursor: "pointer",
  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
};

const containerStyle: React.CSSProperties = {
  width: 300,
  padding: 12,
  background: "#0b1324f2",
  borderRadius: 10,
  boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
  border: "1px solid #0ea5e933",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 8,
};

const footerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
  marginTop: 8,
};

const segmentStyle: React.CSSProperties = {
  border: "none",
  borderRadius: 6,
  padding: "6px 10px",
  fontWeight: 700,
  cursor: "pointer",
};

const ampmStyle: React.CSSProperties = {
  border: "none",
  borderRadius: 6,
  padding: "4px 8px",
  fontWeight: 700,
  cursor: "pointer",
};
