import React from "react";

interface FooterProps {
  children?: React.ReactNode;
  right?: React.ReactNode;
}

export default function Footer({ children, right }: FooterProps) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "var(--wp--preset--color--background)",
        borderTop: "1px solid var(--wp--preset--color--gray-200)",
        padding: "1rem 2rem",
        boxShadow: "0 -4px 12px rgba(0,0,0,0.08)",
        zIndex: 10,
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "2rem",
        }}
      >
        <div style={{ flex: 1 }}>{children}</div>

        {right ? <div style={{ flexShrink: 0 }}>{right}</div> : null}
      </div>
    </div>
  );
}
