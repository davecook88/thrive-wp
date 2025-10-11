import React, { useState, useRef, useEffect } from "react";

// Common languages list
const COMMON_LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Italian",
  "Portuguese",
  "Chinese (Mandarin)",
  "Chinese (Cantonese)",
  "Japanese",
  "Korean",
  "Arabic",
  "Hindi",
  "Russian",
  "Dutch",
  "Swedish",
  "Norwegian",
  "Danish",
  "Finnish",
  "Greek",
  "Turkish",
  "Hebrew",
  "Thai",
  "Vietnamese",
  "Indonesian",
  "Malay",
  "Filipino",
  "Swahili",
  "Hausa",
  "Yoruba",
  "Amharic",
  "Persian",
  "Urdu",
  "Bengali",
  "Punjabi",
  "Tamil",
  "Telugu",
  "Marathi",
  "Gujarati",
  "Kannada",
  "Malayalam",
  "Oriya",
  "Assamese",
  "Maithili",
  "Sinhala",
  "Nepali",
  "Burmese",
  "Khmer",
  "Lao",
  "Tibetan",
  "Mongolian",
  "Uzbek",
  "Kazakh",
  "Kyrgyz",
  "Tajik",
  "Turkmen",
  "Azerbaijani",
  "Georgian",
  "Armenian",
  "Albanian",
  "Macedonian",
  "Serbian",
  "Croatian",
  "Bosnian",
  "Slovenian",
  "Czech",
  "Slovak",
  "Polish",
  "Hungarian",
  "Romanian",
  "Bulgarian",
  "Ukrainian",
  "Belarusian",
  "Lithuanian",
  "Latvian",
  "Estonian",
  "Icelandic",
  "Irish",
  "Scottish Gaelic",
  "Welsh",
  "Breton",
  "Catalan",
  "Basque",
  "Galician",
  "Afrikaans",
  "Zulu",
  "Xhosa",
  "Sesotho",
  "Tswana",
  "Venda",
  "Tsonga",
  "Shona",
  "Ndebele",
  "Chewa",
  "Tumbuka",
  "Tonga",
  "Herero",
  "Kwangali",
  "Ndonga",
  "Kwanyama",
  "Oshiwambo",
  "Rukwangali",
  "Thimbukushu",
  "Fwe",
  "Gciriku",
  "Kuvale",
  "Mbukushu",
  "Sambyu",
  "Other",
];

interface LanguageSelectorProps {
  label: string;
  selectedLanguages: string[];
  onChange: (languages: string[]) => void;
  disabled?: boolean;
}

export function LanguageSelector({
  label,
  selectedLanguages,
  onChange,
  disabled = false,
}: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter languages based on search term
  const filteredLanguages = COMMON_LANGUAGES.filter(
    (lang) =>
      lang.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !selectedLanguages.includes(lang)
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLanguageSelect = (language: string) => {
    if (!selectedLanguages.includes(language)) {
      onChange([...selectedLanguages, language]);
    }
    setSearchTerm("");
    inputRef.current?.focus();
  };

  const handleLanguageRemove = (language: string) => {
    onChange(selectedLanguages.filter((lang) => lang !== language));
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && filteredLanguages.length > 0) {
      event.preventDefault();
      handleLanguageSelect(filteredLanguages[0]);
    } else if (event.key === "Escape") {
      setIsOpen(false);
      setSearchTerm("");
    }
  };

  return (
    <div className="profile-field profile-field-editing">
      <label className="profile-field-label">{label}</label>

      {/* Selected languages as chips */}
      {selectedLanguages.length > 0 && (
        <div className="language-chips">
          {selectedLanguages.map((language) => (
            <span key={language} className="language-chip">
              {language}
              {!disabled && (
                <button
                  type="button"
                  className="language-chip-remove"
                  onClick={() => handleLanguageRemove(language)}
                  aria-label={`Remove ${language}`}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Dropdown */}
      <div className="language-selector-dropdown" ref={dropdownRef}>
        <input
          ref={inputRef}
          type="text"
          className="profile-field-input language-search-input"
          placeholder="Search and select languages..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />

        {isOpen && (
          <div className="language-dropdown-menu">
            {filteredLanguages.length > 0 ? (
              filteredLanguages.slice(0, 10).map((language) => (
                <div
                  key={language}
                  className="language-dropdown-item"
                  onClick={() => handleLanguageSelect(language)}
                >
                  {language}
                </div>
              ))
            ) : (
              <div className="language-dropdown-item language-dropdown-empty">
                {searchTerm
                  ? "No languages found"
                  : "No more languages available"}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
