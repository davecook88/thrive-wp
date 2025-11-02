import { registerBlockType } from "@wordpress/blocks";
import { InspectorControls, useBlockProps } from "@wordpress/block-editor";
import {
  PanelBody,
  ToggleControl,
  SelectControl,
  RangeControl,
  TextControl,
} from "@wordpress/components";
import { __ } from "@wordpress/i18n";

type Attrs = {
  showFutureOnly?: boolean;
  defaultView?: "week" | "month";
  height?: number;
  showHeading?: boolean;
  headingText?: string;
};

registerBlockType<Attrs>("custom-theme/course-sessions-calendar", {
  title: __("Course Sessions Calendar", "custom-theme"),
  category: "thrive",
  icon: "calendar-alt",
  description: __("Display course sessions in a calendar view", "custom-theme"),
  attributes: {},
  edit: (props) => {
    const { attributes, setAttributes } = props as {
      attributes: Attrs;
      setAttributes: (a: Partial<Attrs>) => void;
    };
    const blockProps = useBlockProps({
      className: "course-calendar-block-editor",
    });

    const showFutureOnly = attributes.showFutureOnly ?? true;
    const defaultView = attributes.defaultView ?? "week";
    const height = attributes.height ?? 600;
    const showHeading = attributes.showHeading ?? true;
    const headingText = attributes.headingText ?? "Course Schedule";

    return (
      <div {...blockProps}>
        <InspectorControls>
          <PanelBody
            title={__("Calendar Settings", "custom-theme")}
            initialOpen
          >
            <ToggleControl
              label={__("Show Future Sessions Only", "custom-theme")}
              help={
                showFutureOnly
                  ? __("Only showing upcoming sessions", "custom-theme")
                  : __("Showing all sessions (past and future)", "custom-theme")
              }
              checked={showFutureOnly}
              onChange={(val) => setAttributes({ showFutureOnly: val })}
            />

            <SelectControl
              label={__("Default View", "custom-theme")}
              value={defaultView}
              options={[
                { label: __("Week View", "custom-theme"), value: "week" },
                { label: __("Month View", "custom-theme"), value: "month" },
              ]}
              onChange={(val: string) => {
                if (val === "week" || val === "month") {
                  setAttributes({ defaultView: val });
                }
              }}
            />

            <RangeControl
              label={__("Calendar Height (px)", "custom-theme")}
              value={height}
              onChange={(val) => setAttributes({ height: val || 600 })}
              min={400}
              max={1000}
              step={50}
            />
          </PanelBody>

          <PanelBody
            title={__("Display Settings", "custom-theme")}
            initialOpen={false}
          >
            <ToggleControl
              label={__("Show Heading", "custom-theme")}
              checked={showHeading}
              onChange={(val) => setAttributes({ showHeading: val })}
            />

            {showHeading && (
              <TextControl
                label={__("Heading Text", "custom-theme")}
                value={headingText}
                onChange={(val) => setAttributes({ headingText: val })}
              />
            )}
          </PanelBody>
        </InspectorControls>

        <div className="course-calendar-placeholder">
          <div className="course-calendar-placeholder__icon">📅</div>
          <h3>{showHeading ? headingText : "Course Schedule"}</h3>
          <p>
            {__("Calendar will display course sessions", "custom-theme")}
            {showFutureOnly
              ? __(" (future only)", "custom-theme")
              : __(" (all)", "custom-theme")}
          </p>
          <p>
            <strong>{__("View:", "custom-theme")}</strong> {defaultView} |
            <strong> {__("Height:", "custom-theme")}</strong> {height}px
          </p>
        </div>
      </div>
    );
  },
});
