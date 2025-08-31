import { registerBlockType } from "@wordpress/blocks";
import { InspectorControls, useBlockProps } from "@wordpress/block-editor";
import {
  PanelBody,
  TextControl,
  ColorPalette,
  RangeControl,
} from "@wordpress/components";
import { __ } from "@wordpress/i18n";

interface BlockAttributes {
  heading: string;
  helpText: string;
  accentColor: string;
  showPreviewWeeks: number;
}

registerBlockType<BlockAttributes>("custom-theme/teacher-availability", {
  title: __("Teacher Availability", "custom-theme"),
  icon: "calendar",
  category: "widgets",
  attributes: {
    heading: {
      type: "string",
      default: "Set Your Availability",
    },
    helpText: {
      type: "string",
      default: "Configure your weekly schedule and any exceptions.",
    },
    accentColor: {
      type: "string",
      default: "#9aa8ff",
    },
    showPreviewWeeks: {
      type: "number",
      default: 2,
    },
  },
  edit: ({ attributes, setAttributes }) => {
    const { heading, helpText, accentColor, showPreviewWeeks } = attributes;
    const blockProps = useBlockProps();

    return (
      <>
        <InspectorControls>
          <PanelBody title={__("Settings", "custom-theme")}>
            <TextControl
              label={__("Heading", "custom-theme")}
              value={heading}
              onChange={(value) => setAttributes({ heading: value })}
            />
            <TextControl
              label={__("Help Text", "custom-theme")}
              value={helpText}
              onChange={(value) => setAttributes({ helpText: value })}
            />
            <div>
              <label>{__("Accent Color", "custom-theme")}</label>
              <ColorPalette
                value={accentColor}
                onChange={(value) =>
                  setAttributes({ accentColor: value || "#9aa8ff" })
                }
                colors={[
                  { name: "Blue", color: "#9aa8ff" },
                  { name: "Green", color: "#10b981" },
                  { name: "Purple", color: "#8b5cf6" },
                  { name: "Red", color: "#ef4444" },
                ]}
              />
            </div>
            <RangeControl
              label={__("Preview Weeks", "custom-theme")}
              value={showPreviewWeeks}
              onChange={(value) =>
                setAttributes({ showPreviewWeeks: value || 2 })
              }
              min={1}
              max={8}
            />
          </PanelBody>
        </InspectorControls>

        <div
          {...blockProps}
          style={{
            border: "1px solid #e1e5e9",
            borderRadius: "8px",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <h2 style={{ color: accentColor, marginBottom: "0.5rem" }}>
            {heading}
          </h2>
          <p style={{ color: "#64748b", margin: "0 0 1rem 0" }}>{helpText}</p>
          <div
            style={{
              background: "#f8fafc",
              padding: "1rem",
              borderRadius: "4px",
              marginBottom: "1rem",
            }}
          >
            <strong>Teacher Availability Management</strong>
            <br />
            <small style={{ color: "#64748b" }}>
              Preview: {showPreviewWeeks} week
              {showPreviewWeeks !== 1 ? "s" : ""}
            </small>
          </div>
          <div style={{ color: "#64748b", fontStyle: "italic" }}>
            Interactive availability management will appear here when published.
          </div>
        </div>
      </>
    );
  },
  save: () => {
    // Dynamic block - render handled by PHP
    return null;
  },
});
