import React from "react";

interface LocationFieldProps {
  label: string;
  cityId: string;
  countryId: string;
  cityValue: string;
  countryValue: string;
  onCityChange: (value: string) => void;
  onCountryChange: (value: string) => void;
  disabled?: boolean;
}

export function LocationField({
  label,
  cityId,
  countryId,
  cityValue,
  countryValue,
  onCityChange,
  onCountryChange,
  disabled = false,
}: LocationFieldProps) {
  return (
    <div className="profile-field profile-field-editing">
      <fieldset className="profile-field-fieldset">
        <legend className="profile-field-label">{label}</legend>
        <div className="profile-field-row">
          <input
            id={cityId}
            type="text"
            value={cityValue}
            onChange={(e) => onCityChange(e.target.value)}
            placeholder="City"
            className="profile-field-input"
            disabled={disabled}
          />
          <input
            id={countryId}
            type="text"
            value={countryValue}
            onChange={(e) => onCountryChange(e.target.value)}
            placeholder="Country"
            className="profile-field-input"
            disabled={disabled}
          />
        </div>
      </fieldset>
    </div>
  );
}
