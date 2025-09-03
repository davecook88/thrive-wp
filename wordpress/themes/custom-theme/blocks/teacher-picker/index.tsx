import { registerBlockType } from "@wordpress/blocks";
import { __ } from "@wordpress/i18n";
import { InspectorControls, useBlockProps } from "@wordpress/block-editor";
import { PanelBody, TextControl, ToggleControl } from "@wordpress/components";

interface Attrs {
  heading?: string;
  showFilters?: boolean;
}

registerBlockType<Attrs>("custom-theme/teacher-picker", {
  title: __("Teacher Picker", "custom-theme"),
  icon: "groups",
  category: "widgets",
  attributes: {
    heading: { type: "string", default: "Choose a Teacher" },
    showFilters: { type: "boolean", default: true },
  },
  edit: ({ attributes, setAttributes }) => {
    const blockProps = useBlockProps({ className: "thrive-teacher-picker" });
    const { heading, showFilters } = attributes;

    return (
      <div {...blockProps}>
        <InspectorControls>
          <PanelBody title={__("Settings", "custom-theme")}>
            <TextControl
              label={__("Heading", "custom-theme")}
              value={heading || ""}
              onChange={(v) => setAttributes({ heading: v })}
            />
            <ToggleControl
              label={__("Show Filters", "custom-theme")}
              checked={!!showFilters}
              onChange={(v) => setAttributes({ showFilters: !!v })}
            />
          </PanelBody>
        </InspectorControls>
        <div style={{ border: "1px dashed #e5e7eb", padding: 12 }}>
          <strong>{heading || "Choose a Teacher"}</strong>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
            {__(
              "A list of teachers will appear here on the site.",
              "custom-theme"
            )}
          </div>
        </div>
      </div>
    );
  },
  save: ({ attributes }) => {
    const { heading, showFilters } = attributes;
    const props = useBlockProps.save({
      className: "thrive-teacher-picker",
    } as any);
    return (
      <div
        {...props}
        data-heading={heading}
        data-show-filters={showFilters ? "1" : "0"}
      ></div>
    );
  },
});
