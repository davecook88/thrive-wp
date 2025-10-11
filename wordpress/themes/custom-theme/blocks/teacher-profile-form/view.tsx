import { createRoot } from "react-dom/client";
import { useState, useEffect } from "@wordpress/element";
import { ProfilePictureUpload } from "../../components/ProfilePictureUpload";
import "./teacher-profile-form.css";
import "../../components/upload-components.css";

const ELEMENT_CLASS = ".thrive-teacher-profile-form";

interface TeacherLocation {
  city: string;
  country: string;
  lat?: number;
  lng?: number;
}

interface TeacherProfile {
  userId: number;
  teacherId: number;
  firstName: string;
  lastName: string;
  email: string;
  bio: string | null;
  avatarUrl: string | null;
  birthplace: TeacherLocation | null;
  currentLocation: TeacherLocation | null;
  specialties: string[] | null;
  yearsExperience: number | null;
  languagesSpoken: string[] | null;
  tier: number;
  isActive: boolean;
}

type EditableField =
  | "bio"
  | "avatar"
  | "birthplace"
  | "location"
  | "specialties"
  | "experience"
  | "languages";

function TeacherProfileForm() {
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [editingField, setEditingField] = useState<EditableField | null>(null);

  // Form fields
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [birthplaceCity, setBirthplaceCity] = useState("");
  const [birthplaceCountry, setBirthplaceCountry] = useState("");
  const [currentLocationCity, setCurrentLocationCity] = useState("");
  const [currentLocationCountry, setCurrentLocationCountry] = useState("");
  const [specialtiesText, setSpecialtiesText] = useState("");
  const [yearsExperience, setYearsExperience] = useState<number | "">("");
  const [languagesText, setLanguagesText] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/teachers/me/profile");

      if (!response.ok) {
        throw new Error("Failed to load profile");
      }

      const data = await response.json();
      setProfile(data);

      // Populate form fields
      setBio(data.bio || "");
      setAvatarUrl(data.avatarUrl || "");
      setBirthplaceCity(data.birthplace?.city || "");
      setBirthplaceCountry(data.birthplace?.country || "");
      setCurrentLocationCity(data.currentLocation?.city || "");
      setCurrentLocationCountry(data.currentLocation?.country || "");
      setSpecialtiesText((data.specialties || []).join(", "));
      setYearsExperience(data.yearsExperience ?? "");
      setLanguagesText((data.languagesSpoken || []).join(", "));
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveField = async (field: EditableField) => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const updateData: any = {};

      switch (field) {
        case "bio":
          updateData.bio = bio || null;
          break;
        case "avatar":
          updateData.avatarUrl = avatarUrl || null;
          break;
        case "birthplace":
          if (birthplaceCity || birthplaceCountry) {
            updateData.birthplace = {
              city: birthplaceCity,
              country: birthplaceCountry,
            };
          }
          break;
        case "location":
          if (currentLocationCity || currentLocationCountry) {
            updateData.currentLocation = {
              city: currentLocationCity,
              country: currentLocationCountry,
            };
          }
          break;
        case "specialties":
          if (specialtiesText.trim()) {
            updateData.specialties = specialtiesText
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
          } else {
            updateData.specialties = [];
          }
          break;
        case "experience":
          updateData.yearsExperience =
            yearsExperience !== "" ? Number(yearsExperience) : null;
          break;
        case "languages":
          if (languagesText.trim()) {
            updateData.languagesSpoken = languagesText
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
          } else {
            updateData.languagesSpoken = [];
          }
          break;
      }

      const response = await fetch("/api/teachers/me/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      const updatedProfile = await response.json();
      setProfile(updatedProfile);
      setSuccess(true);
      setEditingField(null);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (profile) {
      // Reset form fields to current profile values
      setBio(profile.bio || "");
      setAvatarUrl(profile.avatarUrl || "");
      setBirthplaceCity(profile.birthplace?.city || "");
      setBirthplaceCountry(profile.birthplace?.country || "");
      setCurrentLocationCity(profile.currentLocation?.city || "");
      setCurrentLocationCountry(profile.currentLocation?.country || "");
      setSpecialtiesText((profile.specialties || []).join(", "));
      setYearsExperience(profile.yearsExperience ?? "");
      setLanguagesText((profile.languagesSpoken || []).join(", "));
    }
    setEditingField(null);
  };

  const renderFieldDisplay = (
    field: EditableField,
    label: string,
    value: string | null
  ) => {
    return (
      <div className="profile-field">
        <div className="profile-field-header">
          <span className="profile-field-label">{label}</span>
          <button
            type="button"
            className="profile-field-edit-btn"
            onClick={() => setEditingField(field)}
            disabled={saving}
          >
            Edit
          </button>
        </div>
        <div className="profile-field-value">
          {value || <span className="profile-field-empty">Not set</span>}
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="teacher-profile-loading">Loading profile...</div>;
  }

  if (error && !profile) {
    return <div className="teacher-profile-error">Error: {error}</div>;
  }

  return (
    <div className="teacher-profile-form-container">
      <h2>Your Profile</h2>
      {success && <div className="teacher-profile-success">Saved!</div>}
      {error && <div className="teacher-profile-error">Error: {error}</div>}

      <div className="teacher-profile-fields">
        {/* Profile Picture */}
        <div className="profile-field">
          <div className="profile-field-label-solo">Profile Picture</div>
          <ProfilePictureUpload
            currentAvatarUrl={avatarUrl}
            onAvatarUpdate={(url: string | null) => {
              setAvatarUrl(url || "");
              if (url !== avatarUrl) {
                handleSaveField("avatar");
              }
            }}
            onError={(err: string) => setError(err)}
            userName={profile ? `${profile.firstName} ${profile.lastName}` : undefined}
            disabled={saving}
          />
        </div>

        {/* Bio */}
        {editingField === "bio" ? (
          <div className="profile-field profile-field-editing">
            <label className="profile-field-label">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              placeholder="Tell us about yourself..."
              className="profile-field-textarea"
            />
            <div className="profile-field-actions">
              <button
                type="button"
                onClick={() => handleSaveField("bio")}
                disabled={saving}
                className="profile-field-btn profile-field-btn-save"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={saving}
                className="profile-field-btn profile-field-btn-cancel"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          renderFieldDisplay("bio", "Bio", profile?.bio || null)
        )}

        {/* Birthplace */}
        {editingField === "birthplace" ? (
          <div className="profile-field profile-field-editing">
            <label className="profile-field-label">Birthplace</label>
            <div className="profile-field-row">
              <input
                type="text"
                value={birthplaceCity}
                onChange={(e) => setBirthplaceCity(e.target.value)}
                placeholder="City"
                className="profile-field-input"
              />
              <input
                type="text"
                value={birthplaceCountry}
                onChange={(e) => setBirthplaceCountry(e.target.value)}
                placeholder="Country"
                className="profile-field-input"
              />
            </div>
            <div className="profile-field-actions">
              <button
                type="button"
                onClick={() => handleSaveField("birthplace")}
                disabled={saving}
                className="profile-field-btn profile-field-btn-save"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={saving}
                className="profile-field-btn profile-field-btn-cancel"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          renderFieldDisplay(
            "birthplace",
            "Birthplace",
            profile?.birthplace
              ? [profile.birthplace.city, profile.birthplace.country]
                  .filter(Boolean)
                  .join(", ")
              : null
          )
        )}

        {/* Current Location */}
        {editingField === "location" ? (
          <div className="profile-field profile-field-editing">
            <label className="profile-field-label">Current Location</label>
            <div className="profile-field-row">
              <input
                type="text"
                value={currentLocationCity}
                onChange={(e) => setCurrentLocationCity(e.target.value)}
                placeholder="City"
                className="profile-field-input"
              />
              <input
                type="text"
                value={currentLocationCountry}
                onChange={(e) => setCurrentLocationCountry(e.target.value)}
                placeholder="Country"
                className="profile-field-input"
              />
            </div>
            <div className="profile-field-actions">
              <button
                type="button"
                onClick={() => handleSaveField("location")}
                disabled={saving}
                className="profile-field-btn profile-field-btn-save"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={saving}
                className="profile-field-btn profile-field-btn-cancel"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          renderFieldDisplay(
            "location",
            "Current Location",
            profile?.currentLocation
              ? [profile.currentLocation.city, profile.currentLocation.country]
                  .filter(Boolean)
                  .join(", ")
              : null
          )
        )}

        {/* Specialties */}
        {editingField === "specialties" ? (
          <div className="profile-field profile-field-editing">
            <label className="profile-field-label">Specialties</label>
            <input
              type="text"
              value={specialtiesText}
              onChange={(e) => setSpecialtiesText(e.target.value)}
              placeholder="e.g., Conversation, Grammar"
              className="profile-field-input"
            />
            <div className="profile-field-actions">
              <button
                type="button"
                onClick={() => handleSaveField("specialties")}
                disabled={saving}
                className="profile-field-btn profile-field-btn-save"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={saving}
                className="profile-field-btn profile-field-btn-cancel"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          renderFieldDisplay(
            "specialties",
            "Specialties",
            profile?.specialties ? profile.specialties.join(", ") : null
          )
        )}

        {/* Years of Experience */}
        {editingField === "experience" ? (
          <div className="profile-field profile-field-editing">
            <label className="profile-field-label">Years of Experience</label>
            <input
              type="number"
              value={yearsExperience}
              onChange={(e) =>
                setYearsExperience(e.target.value === "" ? "" : Number(e.target.value))
              }
              min={0}
              max={100}
              placeholder="0"
              className="profile-field-input"
            />
            <div className="profile-field-actions">
              <button
                type="button"
                onClick={() => handleSaveField("experience")}
                disabled={saving}
                className="profile-field-btn profile-field-btn-save"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={saving}
                className="profile-field-btn profile-field-btn-cancel"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          renderFieldDisplay(
            "experience",
            "Years of Experience",
            profile?.yearsExperience !== null && profile?.yearsExperience !== undefined
              ? String(profile.yearsExperience)
              : null
          )
        )}

        {/* Languages Spoken */}
        {editingField === "languages" ? (
          <div className="profile-field profile-field-editing">
            <label className="profile-field-label">Languages Spoken</label>
            <input
              type="text"
              value={languagesText}
              onChange={(e) => setLanguagesText(e.target.value)}
              placeholder="e.g., English, Spanish, French"
              className="profile-field-input"
            />
            <div className="profile-field-actions">
              <button
                type="button"
                onClick={() => handleSaveField("languages")}
                disabled={saving}
                className="profile-field-btn profile-field-btn-save"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={saving}
                className="profile-field-btn profile-field-btn-cancel"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          renderFieldDisplay(
            "languages",
            "Languages Spoken",
            profile?.languagesSpoken ? profile.languagesSpoken.join(", ") : null
          )
        )}
      </div>
    </div>
  );
}

// Mount the React component when the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll<HTMLElement>(ELEMENT_CLASS).forEach((container) => {
    if (!container) return;

    // Check if already mounted
    if ((container as any)._reactRoot) return;

    const root = createRoot(container);
    (container as any)._reactRoot = root;

    // Render the React component
    root.render(<TeacherProfileForm />);
  });
});
