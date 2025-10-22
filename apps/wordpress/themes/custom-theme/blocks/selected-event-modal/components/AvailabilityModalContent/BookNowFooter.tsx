import Footer from "./Footer";

interface BookNowFooterProps {
  bookingConfirmationUrl: string | null;
}

export default function BookNowFooter({
  bookingConfirmationUrl,
}: BookNowFooterProps) {
  const cta = (
    <a
      href={bookingConfirmationUrl || undefined}
      role="button"
      aria-disabled={!bookingConfirmationUrl}
      style={{
        display: "inline-block",
        padding: "0.5rem 0.9rem",
        background: bookingConfirmationUrl
          ? "var(--wp--preset--color--accent, #f97316)"
          : "var(--wp--preset--color--gray-200)",
        borderRadius: 6,
        color: bookingConfirmationUrl
          ? "white"
          : "var(--wp--preset--color--gray-600)",
        fontWeight: 700,
        fontSize: "0.95rem",
        textDecoration: "none",
      }}
    >
      {bookingConfirmationUrl ? "Book now" : "Select a teacher"}
    </a>
  );

  return (
    <Footer right={cta}>
      <h4
        style={{
          margin: "0 0 0.25rem 0",
          fontSize: "0.95rem",
          fontWeight: 700,
          color: "var(--wp--preset--color--foreground)",
        }}
      >
        Book this session
      </h4>
      <div
        style={{
          color: "var(--wp--preset--color--gray-600)",
          fontSize: "0.85rem",
        }}
      >
        Click the button to continue to the booking flow.
      </div>
    </Footer>
  );
}
