import { registerBlockType } from "@wordpress/blocks";
import { __ } from "@wordpress/i18n";
import { PanelBody, ToggleControl } from "@wordpress/components";
import { InspectorControls, useBlockProps } from "@wordpress/block-editor";

type Attrs = {
  showDescription?: boolean;
  showLevelBadges?: boolean;
  showPrice?: boolean;
  showStepCount?: boolean;
};

registerBlockType<Attrs>("custom-theme/course-header", {
  title: __("Course Header", "custom-theme"),
  category: "thrive",
  icon: "welcome-learn-more",
  description: __(
    "Display course title, description, levels, and price",
    "custom-theme",
  ),
  attributes: {},
  edit: (props) => {
    const { attributes, setAttributes } = props as {
      attributes: Attrs;
      setAttributes: (a: Partial<Attrs>) => void;
    };
    const blockProps = useBlockProps({
      className: "course-header-block-editor",
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
        </InspectorControls>

        <div className="course-header-preview">
          <div className="components-placeholder">
            <div className="components-placeholder__label">
              📚 Course Header Block
            </div>
            <div className="components-placeholder__instructions">
              <p>
                This block displays the course title, description, levels, and
                pricing from the NestJS API.
              </p>
              <ul style={{ textAlign: "left", marginTop: "1rem" }}>
                <li>Description: {attributes.showDescription ? "✓" : "✗"}</li>
                <li>Level Badges: {attributes.showLevelBadges ? "✓" : "✗"}</li>
                <li>Price: {attributes.showPrice ? "✓" : "✗"}</li>
                <li>Session Count: {attributes.showStepCount ? "✓" : "✗"}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  },
  save: () => null, // Dynamic block, rendered server-side
});
