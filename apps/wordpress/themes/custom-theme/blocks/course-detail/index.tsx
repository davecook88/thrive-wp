import { registerBlockType } from "@wordpress/blocks";
import { __ } from "@wordpress/i18n";
import { PanelBody, ToggleControl, SelectControl, RangeControl } from "@wordpress/components";
import { InspectorControls, useBlockProps } from "@wordpress/block-editor";

type Attrs = {
  showDescription?: boolean;
  showLevelBadges?: boolean;
  showPrice?: boolean;
  showStepCount?: boolean;
  defaultView?: "week" | "month";
  calendarHeight?: number;
};

registerBlockType<Attrs>("custom-theme/course-detail", {
  title: __("Course Detail Page", "custom-theme"),
  category: "thrive",
  icon: "welcome-learn-more",
  description: __(
    "Complete course detail page with schedule selection and enrollment",
    "custom-theme",
  ),
  attributes: {},
  edit: (props) => {
    const { attributes, setAttributes } = props as {
      attributes: Attrs;
      setAttributes: (a: Partial<Attrs>) => void;
    };
    const blockProps = useBlockProps({
      className: "course-detail-block-editor",
    });

    return (
      <div {...blockProps}>
        <InspectorControls>
          <PanelBody title={__("Display Settings", "custom-theme")} initialOpen>
            <ToggleControl
              label={__("Show Description", "custom-theme")}
              checked={attributes.showDescription ?? true}
              onChange={(showDescription) => setAttributes({ showDescription })}
            />
            <ToggleControl
              label={__("Show Level Badges", "custom-theme")}
              checked={attributes.showLevelBadges ?? true}
              onChange={(showLevelBadges) => setAttributes({ showLevelBadges })}
            />
            <ToggleControl
              label={__("Show Price", "custom-theme")}
              checked={attributes.showPrice ?? true}
              onChange={(showPrice) => setAttributes({ showPrice })}
            />
            <ToggleControl
              label={__("Show Session Count", "custom-theme")}
              checked={attributes.showStepCount ?? true}
              onChange={(showStepCount) => setAttributes({ showStepCount })}
            />
          </PanelBody>

          <PanelBody title={__("Calendar Settings", "custom-theme")}>
            <SelectControl
              label={__("Default View", "custom-theme")}
              value={attributes.defaultView ?? "week"}
              options={[
                { label: __("Week View", "custom-theme"), value: "week" },
                { label: __("Month View", "custom-theme"), value: "month" },
              ]}
              onChange={(defaultView) =>
                setAttributes({ defaultView: defaultView as "week" | "month" })
              }
            />
            <RangeControl
              label={__("Calendar Height (px)", "custom-theme")}
              value={attributes.calendarHeight ?? 600}
              onChange={(calendarHeight) => setAttributes({ calendarHeight })}
              min={400}
              max={1000}
              step={50}
            />
          </PanelBody>
        </InspectorControls>

        <div className="course-detail-preview">
          <div className="components-placeholder">
            <div className="components-placeholder__label">
              📚 Course Detail Block
            </div>
            <div className="components-placeholder__instructions">
              <p>
                This block displays the complete course page with schedule selection,
                calendar, and enrollment functionality.
              </p>
              <ul style={{ textAlign: "left", marginTop: "1rem" }}>
                <li>Description: {attributes.showDescription ? "✓" : "✗"}</li>
                <li>Level Badges: {attributes.showLevelBadges ? "✓" : "✗"}</li>
                <li>Price: {attributes.showPrice ? "✓" : "✗"}</li>
                <li>Session Count: {attributes.showStepCount ? "✓" : "✗"}</li>
                <li>Calendar View: {attributes.defaultView ?? "week"}</li>
                <li>Calendar Height: {attributes.calendarHeight ?? 600}px</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  },
  save: () => null, // Dynamic block, rendered server-side
});
