interface TeacherInfoSkeletonProps {
  layout: "horizontal" | "vertical" | "card";
  size: "small" | "medium" | "large";
  showAvatar: boolean;
}

export default function TeacherInfoSkeleton({
  layout,
  size,
  showAvatar,
}: TeacherInfoSkeletonProps) {
  const avatarSize = size === "small" ? 60 : size === "large" ? 120 : 80;

  return (
    <div
      className={`teacher-info teacher-info--${layout} teacher-info--${size} teacher-info--skeleton`}
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "8px",
        padding: size === "small" ? "1rem" : size === "large" ? "2rem" : "1.5rem",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      }}
    >
      <div className="teacher-info__content">
        {showAvatar && (
          <div
            className="teacher-info__avatar skeleton-pulse"
            style={{
              width: avatarSize,
              height: avatarSize,
              borderRadius: "50%",
              backgroundColor: "#e5e7eb",
            }}
          />
        )}
        <div className="teacher-info__details" style={{ flex: 1 }}>
          <div
            className="skeleton-pulse"
            style={{
              height: "1.5rem",
              width: "60%",
              backgroundColor: "#e5e7eb",
              borderRadius: "4px",
              marginBottom: "0.5rem",
            }}
          />
          <div
            className="skeleton-pulse"
            style={{
              height: "1rem",
              width: "40%",
              backgroundColor: "#e5e7eb",
              borderRadius: "4px",
              marginBottom: "1rem",
            }}
          />
          <div
            className="skeleton-pulse"
            style={{
              height: "3rem",
              width: "100%",
              backgroundColor: "#e5e7eb",
              borderRadius: "4px",
            }}
          />
        </div>
      </div>
    </div>
  );
}
