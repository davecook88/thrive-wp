import { registerBlockType } from "@wordpress/blocks";
import { __ } from "@wordpress/i18n";
import { PanelBody, SelectControl, RangeControl } from "@wordpress/components";
import { InspectorControls, useBlockProps } from "@wordpress/block-editor";

type Attrs = {
  view?: "week" | "day" | "month" | "list";
  slotDuration?: number;
  snapTo?: number;
  viewHeight?: number;
};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "thrive-calendar": any;
    }
  }
}

registerBlockType<Attrs>("custom-theme/student-calendar", {
  title: __("Student Calendar", "custom-theme"),
  category: "widgets",
  icon: "calendar-alt",
  description: __(
    "Calendar showing the logged-in student's sessions and bookings.",
    "custom-theme"
  ),
  attributes: {},
  edit: (props) => {
    const { attributes, setAttributes } = props as any as {
      attributes: Attrs;
      setAttributes: (a: Partial<Attrs>) => void;
    };
    const blockProps = useBlockProps({ className: "student-calendar-block" });

    return (
      <div {...blockProps}>
        <InspectorControls>
          <PanelBody
            title={__("Calendar Settings", "custom-theme")}
            initialOpen
          >
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
        </InspectorControls>

        <div
          className="student-calendar-preview"
          style={{
            marginTop: 16,
            padding: 12,
            border: "1px solid #e5e7eb",
            borderRadius: 8,
          }}
        >
          <strong>{__("Student Calendar Preview", "custom-theme")}</strong>
          <div style={{ marginTop: 8, fontSize: "12px", color: "#6b7280" }}>
            {__(
              "This calendar will show the logged-in student's sessions and bookings.",
              "custom-theme"
            )}
          </div>
          <div style={{ marginTop: 8 }}>
            <thrive-calendar
              view={attributes.view || "week"}
              mode="student"
              show-classes="true"
              show-availability="false"
              show-bookings="true"
            ></thrive-calendar>
          </div>
        </div>
      </div>
    );
  },
  save: () => null,
});
