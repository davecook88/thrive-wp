import { useState, useEffect } from "@wordpress/element";
import type { Teacher, TeacherLocation } from "../../../types/calendar";

interface TeacherInfoProps {
  teacher: Teacher | null;
  layout: "horizontal" | "vertical" | "card";
  size: "small" | "medium" | "large";
  showAvatar: boolean;
  showLocation: boolean;
  showBio: boolean;
  showSpecialties: boolean;
  showStats: boolean;
  showMap: boolean;
  backgroundColor: string;
  borderRadius: string;
}

export default function TeacherInfo({
  teacher,
  layout,
  size,
  showAvatar,
  showLocation,
  showBio,
  showSpecialties,
  showStats,
  showMap,
  backgroundColor,
  borderRadius,
}: TeacherInfoProps) {
  if (!teacher) {
    return null;
  }

  const avatarSize =
    size === "small" ? 60 : size === "large" ? 120 : 80;

  const getAvatarUrl = () => {
    if (teacher.avatarUrl) return teacher.avatarUrl;
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(teacher.name)}`;
  };

  const formatLocation = (location: TeacherLocation | null) => {
    if (!location) return null;
    return `${location.city}, ${location.country}`;
  };

  const getMapUrl = (location: TeacherLocation | null) => {
    if (!location || !location.lat || !location.lng) return null;
    return `https://maps.googleapis.com/maps/api/staticmap?center=${location.lat},${location.lng}&zoom=8&size=400x200&markers=${location.lat},${location.lng}&key=YOUR_API_KEY`;
  };

  const containerClass = `teacher-info teacher-info--${layout} teacher-info--${size}`;

  const containerStyle: React.CSSProperties = {
    backgroundColor: backgroundColor || "#ffffff",
    borderRadius: borderRadius || "8px",
    padding: size === "small" ? "1rem" : size === "large" ? "2rem" : "1.5rem",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  };

  return (
    <div className={containerClass} style={containerStyle}>
      <div className="teacher-info__content">
        {showAvatar && (
          <div className="teacher-info__avatar">
            <img
              src={getAvatarUrl()}
              alt={teacher.name}
              style={{
                width: avatarSize,
                height: avatarSize,
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
          </div>
        )}

        <div className="teacher-info__details">
          <h3 className="teacher-info__name">{teacher.name}</h3>

          {showLocation && (teacher.birthplace || teacher.currentLocation) && (
            <div className="teacher-info__locations">
              {teacher.birthplace && (
                <div className="teacher-info__location">
                  <span className="teacher-info__location-label">From:</span>
                  <span className="teacher-info__location-value">
                    {formatLocation(teacher.birthplace)}
                  </span>
                </div>
              )}
              {teacher.currentLocation && (
                <div className="teacher-info__location">
                  <span className="teacher-info__location-label">Currently:</span>
                  <span className="teacher-info__location-value">
                    {formatLocation(teacher.currentLocation)}
                  </span>
                </div>
              )}
            </div>
          )}

          {showBio && teacher.bio && (
            <p className="teacher-info__bio">{teacher.bio}</p>
          )}

          {showSpecialties && teacher.specialties && teacher.specialties.length > 0 && (
            <div className="teacher-info__specialties">
              <h4 className="teacher-info__specialties-title">Specialties</h4>
              <div className="teacher-info__specialties-list">
                {teacher.specialties.map((specialty, index) => (
                  <span key={index} className="teacher-info__specialty-tag">
                    {specialty}
                  </span>
                ))}
              </div>
            </div>
          )}

          {showStats && (
            <div className="teacher-info__stats">
              {teacher.yearsExperience && (
                <div className="teacher-info__stat">
                  <strong>{teacher.yearsExperience}+</strong> years teaching
                </div>
              )}
              {teacher.languagesSpoken && teacher.languagesSpoken.length > 0 && (
                <div className="teacher-info__stat">
                  <strong>Languages:</strong> {teacher.languagesSpoken.join(", ")}
                </div>
              )}
            </div>
          )}

          {showMap && teacher.currentLocation && getMapUrl(teacher.currentLocation) && (
            <div className="teacher-info__map">
              <img
                src={getMapUrl(teacher.currentLocation)!}
                alt={`Map of ${formatLocation(teacher.currentLocation)}`}
                style={{
                  width: "100%",
                  height: "auto",
                  borderRadius: "4px",
                  marginTop: "1rem",
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
