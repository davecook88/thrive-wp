import { registerBlockType } from "@wordpress/blocks";
import { __ } from "@wordpress/i18n";
import { PanelBody, SelectControl, RangeControl, TextControl, ToggleControl } from "@wordpress/components";
import { InspectorControls, useBlockProps } from "@wordpress/block-editor";

type Attrs = {
  view?: "week" | "day" | "month" | "list";
  slotDuration?: number;
  snapTo?: number;
  viewHeight?: number;
  heading?: string;
  showFilters?: boolean;
};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "thrive-calendar": any;
    }
  }
}

registerBlockType<Attrs>("custom-theme/private-session-availability-calendar", {
  title: __("Private Session Availability", "custom-theme"),
  category: "widgets",
  icon: "calendar",
  description: __(
    "Browse teachers' private-session availability and pick a time.",
    "custom-theme"
  ),
  attributes: {},
  edit: (props) => {
    const { attributes, setAttributes } = props as any as {
      attributes: Attrs;
      setAttributes: (a: Partial<Attrs>) => void;
    };
    const blockProps = useBlockProps({ className: "private-session-availability-calendar-block" });

    return (
      <div {...blockProps}>
        <InspectorControls>
          <PanelBody title={__("Calendar Settings", "custom-theme")} initialOpen>
            <SelectControl
              label={__("View", "custom-theme")}
              value={attributes.view || "week"}
              options={[
                { label: "Week", value: "week" },
                { label: "Day", value: "day" },
                { label: "Month", value: "month" },
                { label: "List", value: "list" },
              ]}
              onChange={(view) => setAttributes({ view })}
            />
            <RangeControl
              label={__("Slot Duration (minutes)", "custom-theme")}
              value={attributes.slotDuration ?? 30}
              min={5}
              max={120}
              step={5}
              onChange={(slotDuration) => setAttributes({ slotDuration })}
            />
            <RangeControl
              label={__("Snap To (minutes)", "custom-theme")}
              value={attributes.snapTo ?? 15}
              min={5}
              max={60}
              step={5}
              onChange={(snapTo) => setAttributes({ snapTo })}
            />
          </PanelBody>
          <PanelBody title={__("Layout", "custom-theme")} initialOpen={false}>
            <RangeControl
              label={__("View Height (px)", "custom-theme")}
              value={attributes.viewHeight ?? 600}
              min={300}
              max={1200}
              step={50}
              onChange={(viewHeight) => setAttributes({ viewHeight })}
            />
          </PanelBody>
          <PanelBody title={__("Content", "custom-theme")} initialOpen={false}>
            <TextControl
              label={__("Heading", "custom-theme")}
              value={attributes.heading ?? "Book a Private Session"}
              onChange={(heading) => setAttributes({ heading })}
            />
            <ToggleControl
              label={__("Show Filters", "custom-theme")}
              checked={attributes.showFilters ?? true}
              onChange={(showFilters) => setAttributes({ showFilters })}
            />
          </PanelBody>
        </InspectorControls>

        <div
          className="private-session-availability-calendar-preview"
          style={{
            marginTop: 16,
            padding: 12,
            border: "1px solid #e5e7eb",
            borderRadius: 8,
          }}
        >
          <strong>{__("Private Session Availability Preview", "custom-theme")}</strong>
          <div style={{ marginTop: 8, fontSize: "12px", color: "#6b7280" }}>
            {__(
              "Students will see available private-session time slots to book.",
              "custom-theme"
            )}
          </div>
          <div style={{ marginTop: 8 }}>
            <thrive-calendar
              view={attributes.view || "week"}
              mode="public"
              show-classes="false"
              show-availability="true"
              show-bookings="false"
            ></thrive-calendar>
          </div>
        </div>
      </div>
    );
  },
  save: () => null,
});
