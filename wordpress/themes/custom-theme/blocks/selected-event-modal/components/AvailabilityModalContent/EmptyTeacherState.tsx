export default function EmptyTeacherState() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        color: "var(--wp--preset--color--gray-500)",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          border: "2px dashed var(--wp--preset--color--gray-300)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "1rem",
          fontSize: "1.5rem",
          fontWeight: 700,
          opacity: 0.6,
        }}
      >
        ?
      </div>
      <div
        style={{
          fontSize: "1.1rem",
          fontWeight: 600,
          marginBottom: "0.5rem",
        }}
      >
        Select a Teacher
      </div>
      <div
        style={{
          fontSize: "0.9rem",
        }}
      >
        Choose a teacher from the left to see their details
      </div>
    </div>
  );
}
