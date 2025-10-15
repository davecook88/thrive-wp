import { Dispatch, SetStateAction } from "react";

interface HeaderProps {
  mode: "view" | "book";
  setMode: Dispatch<SetStateAction<"view" | "book">>;
}

export default function Header({ mode, setMode }: HeaderProps) {
  return (
    <div
      style={{
        marginBottom: 16,
        padding: 16,
        background:
          mode === "view"
            ? "var(--wp--preset--color--gray-50)"
            : "var(--wp--preset--color--accent-light, #f0fdf4)",
        borderRadius: 12,
        border: "2px solid",
        borderColor:
          mode === "view"
            ? "var(--wp--preset--color--gray-200)"
            : "var(--wp--preset--color--accent, #10b981)",
        transition: "all 200ms ease",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: mode === "book" ? 16 : 0,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            background: "white",
            borderRadius: 8,
            padding: 4,
            gap: 4,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <button
            type="button"
            onClick={() => setMode("view")}
            style={{
              padding: "8px 16px",
              border: "none",
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              background:
                mode === "view"
                  ? "var(--wp--preset--color--accent, #3b82f6)"
                  : "transparent",
              color:
                mode === "view"
                  ? "white"
                  : "var(--wp--preset--color--gray-700)",
              transition: "all 150ms ease",
            }}
          >
            📅 My Sessions
          </button>
          <button
            type="button"
            onClick={() => setMode("book")}
            style={{
              padding: "8px 16px",
              border: "none",
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              background:
                mode === "book"
                  ? "var(--wp--preset--color--accent, #10b981)"
                  : "transparent",
              color:
                mode === "book"
                  ? "white"
                  : "var(--wp--preset--color--gray-700)",
              transition: "all 150ms ease",
            }}
          >
            ➕ Book More
          </button>
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 12px",
            borderRadius: 6,
            background:
              mode === "view"
                ? "var(--wp--preset--color--gray-100)"
                : "var(--wp--preset--color--accent, #10b981)",
            color: mode === "view" ? "#374151" : "white",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          {mode === "view" ? (
            <>👁️ Viewing your scheduled sessions</>
          ) : (
            <>✨ Browsing available time slots</>
          )}
        </div>
      </div>
    </div>
  );
}
