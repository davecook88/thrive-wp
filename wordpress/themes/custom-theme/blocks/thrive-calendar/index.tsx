import { registerBlockType } from "@wordpress/blocks";
import { __ } from "@wordpress/i18n";
import {
  PanelBody,
  SelectControl,
  TextControl,
  ToggleControl,
  RangeControl,
} from "@wordpress/components";
import {
  InspectorControls,
  useBlockProps,
  InnerBlocks,
} from "@wordpress/block-editor";

type Attrs = {
  view?: "week" | "day" | "month" | "list";
  mode?: "auto" | "public" | "student" | "teacher" | "admin";
  teacherId?: string;
  slotDuration?: number;
  snapTo?: number;
  showClasses?: boolean;
  showAvailability?: boolean;
  showBookings?: boolean;
  defaultModalId?: string;
  oneToOneModalId?: string;
  groupModalId?: string;
  courseModalId?: string;
  viewHeight?: number;
};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "thrive-calendar": any;
    }
  }
}

registerBlockType<Attrs>("custom-theme/thrive-calendar", {
  title: __("Thrive Calendar", "custom-theme"),
  category: "widgets",
  icon: "calendar",
  attributes: {},
  edit: (props) => {
    const { attributes, setAttributes } = props as any as {
      attributes: Attrs;
      setAttributes: (a: Partial<Attrs>) => void;
    };
    const blockProps = useBlockProps({ className: "thrive-calendar-block" });

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
            <SelectControl
              label={__("Mode", "custom-theme")}
              value={attributes.mode || "auto"}
              options={[
                { label: "Auto (based on login/role)", value: "auto" },
                { label: "Public", value: "public" },
                { label: "Student", value: "student" },
                { label: "Teacher", value: "teacher" },
                { label: "Admin", value: "admin" },
              ]}
              onChange={(mode) => setAttributes({ mode })}
            />
            <TextControl
              label={__("Teacher ID (optional)", "custom-theme")}
              value={attributes.teacherId || ""}
              onChange={(teacherId) => setAttributes({ teacherId })}
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
            <ToggleControl
              label={__("Show Classes", "custom-theme")}
              checked={!!attributes.showClasses}
              onChange={(showClasses) => setAttributes({ showClasses })}
            />
            <ToggleControl
              label={__("Show Availability", "custom-theme")}
              checked={!!attributes.showAvailability}
              onChange={(showAvailability) =>
                setAttributes({ showAvailability })
              }
            />
            <ToggleControl
              label={__("Show Bookings", "custom-theme")}
              checked={!!attributes.showBookings}
              onChange={(showBookings) => setAttributes({ showBookings })}
            />
          </PanelBody>
          <PanelBody
            title={__("Modal Mapping", "custom-theme")}
            initialOpen={false}
          >
            <TextControl
              label={__("Default Modal ID", "custom-theme")}
              value={attributes.defaultModalId || ""}
              onChange={(defaultModalId) => setAttributes({ defaultModalId })}
            />
            <TextControl
              label={__("1:1 Modal ID", "custom-theme")}
              value={attributes.oneToOneModalId || ""}
              onChange={(oneToOneModalId) => setAttributes({ oneToOneModalId })}
            />
            <TextControl
              label={__("Group Modal ID", "custom-theme")}
              value={attributes.groupModalId || ""}
              onChange={(groupModalId) => setAttributes({ groupModalId })}
            />
            <TextControl
              label={__("Course Modal ID", "custom-theme")}
              value={attributes.courseModalId || ""}
              onChange={(courseModalId) => setAttributes({ courseModalId })}
            />
            <RangeControl
              label={__("View Height (px)", "custom-theme")}
              value={attributes.viewHeight ?? 600}
              min={300}
              max={1200}
              step={50}
              onChange={(viewHeight) => setAttributes({ viewHeight })}
            />
          </PanelBody>
          <PanelBody
            title={__("Event Modal Content", "custom-theme")}
            initialOpen
          >
            <p style={{ fontSize: "12px", color: "#555" }}>
              {__(
                "Design the modal shown when an event is clicked. You can use placeholders like {{title}}, {{start_local}}, {{teacher_name}}. ",
                "custom-theme"
              )}
            </p>
          </PanelBody>
        </InspectorControls>

        <div className="thrive-calendar-modals">
          <p style={{ fontSize: "12px", color: "#555", marginBottom: 8 }}>
            {__(
              'Add one or more "Thrive Calendar Modal" blocks below. Give each a unique Modal ID. In the calendar settings, you can map events to modal IDs via on-click handlers.',
              "custom-theme"
            )}
          </p>
          <InnerBlocks
            allowedBlocks={["custom-theme/thrive-calendar-modal"]}
            templateLock={false}
          />
        </div>

        <div
          className="thrive-calendar-preview"
          style={{
            marginTop: 16,
            padding: 12,
            border: "1px solid #e5e7eb",
            borderRadius: 8,
          }}
        >
          <strong>{__("Calendar Preview", "custom-theme")}</strong>
          <div style={{ marginTop: 8 }}>
            <thrive-calendar
              view={attributes.view || "week"}
              mode={attributes.mode || "auto"}
              teacher-id={attributes.teacherId || undefined}
            ></thrive-calendar>
          </div>
        </div>
      </div>
    );
  },
  save: () => null,
});
