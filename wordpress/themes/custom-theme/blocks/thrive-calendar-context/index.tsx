import { registerBlockType } from "@wordpress/blocks";
import {
  useBlockProps,
  InnerBlocks,
  InspectorControls,
} from "@wordpress/block-editor";
import { PanelBody, TextControl, SelectControl } from "@wordpress/components";
import { __ } from "@wordpress/i18n";

interface Attrs {
  contextId?: string;
  selectedTeacherId?: string;
  source?: string; // e.g., teacher-availability, classes, bookings
  apiEndpoint?: string;
}

registerBlockType<Attrs>("custom-theme/thrive-calendar-context", {
  title: __("Thrive Calendar Context", "custom-theme"),
  icon: "universal-access-alt",
  category: "widgets",
  attributes: {
    contextId: { type: "string" },
    selectedTeacherId: { type: "string" },
    source: { type: "string", default: "teacher-availability" },
    apiEndpoint: { type: "string", default: "/api/calendar/events" },
  },
  edit: ({ attributes, setAttributes }) => {
    const blockProps = useBlockProps();
    const { contextId, selectedTeacherId, source, apiEndpoint } = attributes;

    return (
      <div {...blockProps}>
        <InspectorControls>
          <PanelBody title={__("Context Settings", "custom-theme")} initialOpen>
            <TextControl
              label={__("Context ID (optional)", "custom-theme")}
              value={contextId || ""}
              onChange={(v) => setAttributes({ contextId: v })}
              help={__(
                "Used to isolate multiple calendars on the same page.",
                "custom-theme"
              )}
            />
            <TextControl
              label={__("Selected Teacher ID (optional)", "custom-theme")}
              value={selectedTeacherId || ""}
              onChange={(v) => setAttributes({ selectedTeacherId: v })}
            />
            <SelectControl
              label={__("Data Source", "custom-theme")}
              value={
                (source || "teacher-availability") as
                  | "teacher-availability"
                  | "classes"
                  | "bookings"
                  | "custom"
              }
              options={[
                {
                  label: "Teacher Availability",
                  value: "teacher-availability",
                },
                { label: "Classes", value: "classes" },
                { label: "Bookings", value: "bookings" },
                { label: "Custom", value: "custom" },
              ]}
              onChange={(v) => setAttributes({ source: v })}
            />
            <TextControl
              label={__("API Endpoint", "custom-theme")}
              value={apiEndpoint || ""}
              onChange={(v) => setAttributes({ apiEndpoint: v })}
            />
          </PanelBody>
        </InspectorControls>

        <div style={{ border: "1px dashed #e5e7eb", padding: "1rem" }}>
          <strong>{__("Calendar Context", "custom-theme")}</strong>
          <div style={{ marginTop: "0.75rem" }}>
            <InnerBlocks
              templateLock={false}
              allowedBlocks={[
                "custom-theme/thrive-calendar",
                "custom-theme/thrive-calendar-modal",
                "custom-theme/teacher-availability",
              ]}
            />
          </div>
        </div>
      </div>
    );
  },
  save: () => {
    const wrapperProps = useBlockProps.save({
      className: "wp-block-custom-theme-thrive-calendar-context",
    } as any);
    return (
      <div {...wrapperProps}>
        <InnerBlocks.Content />
      </div>
    );
  },
});
