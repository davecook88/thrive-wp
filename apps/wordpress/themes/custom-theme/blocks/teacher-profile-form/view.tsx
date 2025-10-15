import { createRoot } from "react-dom/client";
import { useState, useEffect } from "@wordpress/element";
import { ProfilePictureUpload, EditableProfileField } from "../../components";
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
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);

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
      setSelectedLanguages(data.languagesSpoken || []);
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
          updateData.languagesSpoken =
            selectedLanguages.length > 0 ? selectedLanguages : [];
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
      setSelectedLanguages(profile.languagesSpoken || []);
    }
    setEditingField(null);
  };

  if (loading) {
    return <div className="teacher-profile-loading">Loading profile...</div>;
  }

  if (error && !profile) {
    return <div className="teacher-profile-error">Error: {error}</div>;
  }

  return (
    <div className="teacher-profile-form-container">
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
            userName={
              profile ? `${profile.firstName} ${profile.lastName}` : undefined
            }
            disabled={saving}
          />
        </div>

        {/* Bio */}
        <EditableProfileField
          label="Bio"
          value={profile?.bio || null}
          isEditing={editingField === "bio"}
          onEdit={() => setEditingField("bio")}
          onSave={() => handleSaveField("bio")}
          onCancel={handleCancelEdit}
          saving={saving}
          type="textarea"
          fieldId="bio-textarea"
          fieldValue={bio}
          onFieldChange={setBio}
          placeholder="Tell us about yourself..."
          rows={4}
        />

        {/* Birthplace */}
        <EditableProfileField
          label="Birthplace"
          value={
            profile?.birthplace
              ? [profile.birthplace.city, profile.birthplace.country]
                  .filter(Boolean)
                  .join(", ")
              : null
          }
          isEditing={editingField === "birthplace"}
          onEdit={() => setEditingField("birthplace")}
          onSave={() => handleSaveField("birthplace")}
          onCancel={handleCancelEdit}
          saving={saving}
          type="location"
          cityId="birthplace-city"
          countryId="birthplace-country"
          cityValue={birthplaceCity}
          countryValue={birthplaceCountry}
          onCityChange={setBirthplaceCity}
          onCountryChange={setBirthplaceCountry}
        />

        {/* Current Location */}
        <EditableProfileField
          label="Current Location"
          value={
            profile?.currentLocation
              ? [profile.currentLocation.city, profile.currentLocation.country]
                  .filter(Boolean)
                  .join(", ")
              : null
          }
          isEditing={editingField === "location"}
          onEdit={() => setEditingField("location")}
          onSave={() => handleSaveField("location")}
          onCancel={handleCancelEdit}
          saving={saving}
          type="location"
          cityId="current-location-city"
          countryId="current-location-country"
          cityValue={currentLocationCity}
          countryValue={currentLocationCountry}
          onCityChange={setCurrentLocationCity}
          onCountryChange={setCurrentLocationCountry}
        />

        {/* Specialties */}
        <EditableProfileField
          label="Specialties"
          value={profile?.specialties ? profile.specialties.join(", ") : null}
          isEditing={editingField === "specialties"}
          onEdit={() => setEditingField("specialties")}
          onSave={() => handleSaveField("specialties")}
          onCancel={handleCancelEdit}
          saving={saving}
          type="text"
          fieldId="specialties-input"
          fieldValue={specialtiesText}
          onFieldChange={setSpecialtiesText}
          placeholder="e.g., Conversation, Grammar"
        />

        {/* Years of Experience */}
        <EditableProfileField
          label="Years of Experience"
          value={
            profile?.yearsExperience !== null &&
            profile?.yearsExperience !== undefined
              ? String(profile.yearsExperience)
              : null
          }
          isEditing={editingField === "experience"}
          onEdit={() => setEditingField("experience")}
          onSave={() => handleSaveField("experience")}
          onCancel={handleCancelEdit}
          saving={saving}
          type="number"
          fieldId="experience-input"
          fieldValue={yearsExperience}
          onFieldChange={(value) =>
            setYearsExperience(value === "" ? "" : Number(value))
          }
          placeholder="0"
          min={0}
          max={100}
        />

        {/* Languages Spoken */}
        <EditableProfileField
          label="Languages Spoken"
          value={
            profile?.languagesSpoken ? profile.languagesSpoken.join(", ") : null
          }
          isEditing={editingField === "languages"}
          onEdit={() => setEditingField("languages")}
          onSave={() => handleSaveField("languages")}
          onCancel={handleCancelEdit}
          saving={saving}
          type="languages"
          selectedLanguages={selectedLanguages}
          onLanguagesChange={setSelectedLanguages}
        />
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
