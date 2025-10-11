import React from "react";

interface FormFieldProps {
  id: string;
  label: string;
  type?: "text" | "textarea" | "number";
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  rows?: number;
  disabled?: boolean;
}

export function FormField({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  min,
  max,
  rows = 4,
  disabled = false,
}: FormFieldProps) {
  return (
    <div className="profile-field profile-field-editing">
      <label htmlFor={id} className="profile-field-label">
        {label}
      </label>
      {type === "textarea" ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className="profile-field-textarea"
          disabled={disabled}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          min={min}
          max={max}
          className="profile-field-input"
          disabled={disabled}
        />
      )}
    </div>
  );
}
