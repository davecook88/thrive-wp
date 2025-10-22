import { createRoot, Root } from "react-dom/client";
import { useState, useEffect } from "@wordpress/element";
import { ProfilePictureUpload, EditableProfileField } from "../../components";
import { thriveClient } from "../../../../shared/thrive";
import "./teacher-profile-form.css";
import "../../components/upload-components.css";
import { PublicTeacherDto, UpdateTeacherProfileDto } from "@thrive/shared";

const ELEMENT_CLASS = ".thrive-teacher-profile-form";

// Track mounted roots to prevent double-mounting
const mountedRoots = new WeakMap<HTMLElement, Root>();

// Define the EditableField type to avoid implicit any
type EditableField =
  | "bio"
  | "avatar"
  | "birthplace"
  | "location"
  | "specialties"
  | "experience"
  | "languages";

function TeacherProfileForm() {
  const [profile, setProfile] = useState<PublicTeacherDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [editingField, setEditingField] = useState<EditableField | null>(null);

  // Form fields - refine yearsExperience to number | null for consistency
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [birthplaceCity, setBirthplaceCity] = useState("");
  const [birthplaceCountry, setBirthplaceCountry] = useState("");
  const [currentLocationCity, setCurrentLocationCity] = useState("");
  const [currentLocationCountry, setCurrentLocationCountry] = useState("");
  const [specialtiesText, setSpecialtiesText] = useState("");
  const [yearsExperience, setYearsExperience] = useState<number | null>(null);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);

  useEffect(() => {
    fetchProfile().catch(console.error);
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await thriveClient.fetchTeacherProfile();
      if (data) {
        setProfile(data);
      } else {
        throw new Error("Failed to load profile");
      }

      // Populate form fields
      setBio(data.bio || "");
      setAvatarUrl(data.avatarUrl || "");
      setBirthplaceCity(data.birthplace?.city || "");
      setBirthplaceCountry(data.birthplace?.country || "");
      setCurrentLocationCity(data.currentLocation?.city || "");
      setCurrentLocationCountry(data.currentLocation?.country || "");
      setSpecialtiesText((data.specialties || []).join(", "));
      setYearsExperience(data.yearsExperience ?? null);
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
      const updateData: UpdateTeacherProfileDto = {};

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
          } else {
            updateData.birthplace = undefined;
          }
          break;
        case "location":
          if (currentLocationCity || currentLocationCountry) {
            updateData.currentLocation = {
              city: currentLocationCity,
              country: currentLocationCountry,
            };
          } else {
            updateData.currentLocation = undefined;
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
          updateData.yearsExperience = yearsExperience ?? undefined;
          break;
        case "languages":
          updateData.languagesSpoken =
            selectedLanguages.length > 0 ? selectedLanguages : [];
          break;
      }

      const updatedProfile =
        await thriveClient.updateTeacherProfile(updateData);

      if (!updatedProfile) {
        throw new Error("Failed to update profile");
      }
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
      setYearsExperience(profile.yearsExperience ?? null);
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
                void handleSaveField("avatar");
              }
            }}
            onError={(err: string) => setError(err)}
            userName={profile?.displayName || "Teacher"}
            disabled={saving}
          />
        </div>

        {/* Bio */}
        <EditableProfileField
          label="Bio"
          value={profile?.bio || null}
          isEditing={editingField === "bio"}
          onEdit={() => setEditingField("bio")}
          onSave={() => {
            void handleSaveField("bio").catch(console.error);
          }}
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
          onSave={() => {
            handleSaveField("birthplace").catch(console.error);
          }}
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
          onSave={() => void handleSaveField("location")}
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
          onSave={() => void handleSaveField("specialties")}
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
          onSave={() => void handleSaveField("experience")}
          onCancel={handleCancelEdit}
          saving={saving}
          type="number"
          fieldId="experience-input"
          fieldValue={yearsExperience ?? ""}
          onFieldChange={(value) =>
            setYearsExperience(value === "" ? null : Number(value))
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
          onSave={() => void handleSaveField("languages")}
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
  console.log("Mounting TeacherProfileForm...");
  const containers = document.querySelectorAll<HTMLElement>(ELEMENT_CLASS);
  console.log(`Found ${containers.length} containers to mount.`);
  containers.forEach((container) => {
    if (!container || mountedRoots.has(container)) return;

    try {
      const root = createRoot(container);
      mountedRoots.set(container, root);
      root.render(<TeacherProfileForm />);
    } catch (error) {
      console.error("Failed to mount TeacherProfileForm:", error);
    }
  });
});
