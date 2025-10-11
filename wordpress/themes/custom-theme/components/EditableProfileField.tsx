import React from "react";
import { FormField, LocationField, LanguageSelector } from "./index";

type EditableFieldType =
  | "text"
  | "textarea"
  | "number"
  | "location"
  | "languages";

interface BaseEditableProfileFieldProps {
  label: string;
  value: string | null;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}

interface TextFieldProps extends BaseEditableProfileFieldProps {
  type: "text" | "textarea" | "number";
  fieldId: string;
  fieldValue: string | number;
  onFieldChange: (value: string) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  rows?: number;
}

interface LocationFieldProps extends BaseEditableProfileFieldProps {
  type: "location";
  cityId: string;
  countryId: string;
  cityValue: string;
  countryValue: string;
  onCityChange: (value: string) => void;
  onCountryChange: (value: string) => void;
}

interface LanguageFieldProps extends BaseEditableProfileFieldProps {
  type: "languages";
  selectedLanguages: string[];
  onLanguagesChange: (languages: string[]) => void;
}

type EditableProfileFieldProps =
  | TextFieldProps
  | LocationFieldProps
  | LanguageFieldProps;

export function EditableProfileField(props: EditableProfileFieldProps) {
  const { label, value, isEditing, onEdit, onSave, onCancel, saving } = props;

  const renderDisplay = () => (
    <div className="profile-field">
      <div className="profile-field-header">
        <span className="profile-field-label">{label}</span>
        <button
          type="button"
          className="profile-field-edit-btn"
          onClick={onEdit}
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

  const renderEdit = () => {
    const renderField = () => {
      if (props.type === "location") {
        return (
          <LocationField
            label={label}
            cityId={props.cityId}
            countryId={props.countryId}
            cityValue={props.cityValue}
            countryValue={props.countryValue}
            onCityChange={props.onCityChange}
            onCountryChange={props.onCountryChange}
            disabled={saving}
          />
        );
      } else if (props.type === "languages") {
        return (
          <LanguageSelector
            label={label}
            selectedLanguages={props.selectedLanguages}
            onChange={props.onLanguagesChange}
            disabled={saving}
          />
        );
      } else {
        return (
          <FormField
            id={props.fieldId}
            label={label}
            type={props.type}
            value={props.fieldValue}
            onChange={props.onFieldChange}
            placeholder={props.placeholder}
            min={props.min}
            max={props.max}
            rows={props.rows}
            disabled={saving}
          />
        );
      }
    };

    return (
      <>
        {renderField()}
        <div className="profile-field-actions">
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="profile-field-btn profile-field-btn-save"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="profile-field-btn profile-field-btn-cancel"
          >
            Cancel
          </button>
        </div>
      </>
    );
  };

  return isEditing ? renderEdit() : renderDisplay();
}
