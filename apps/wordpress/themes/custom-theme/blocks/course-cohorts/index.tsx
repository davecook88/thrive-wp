import { registerBlockType } from "@wordpress/blocks";
import { __ } from "@wordpress/i18n";
import { PanelBody, TextControl, ToggleControl } from "@wordpress/components";
import { InspectorControls, useBlockProps } from "@wordpress/block-editor";

type Attrs = {
  showDescription?: boolean;
  showEnrollmentCount?: boolean;
  ctaText?: string;
};

registerBlockType<Attrs>("custom-theme/course-cohorts", {
  title: __("Course Cohorts", "custom-theme"),
  category: "thrive",
  icon: "groups",
  description: __(
    "Display available cohorts for a course with enrollment CTAs",
    "custom-theme",
  ),
  attributes: {},
  edit: (props) => {
    const { attributes, setAttributes } = props as {
      attributes: Attrs;
      setAttributes: (a: Partial<Attrs>) => void;
    };
    const blockProps = useBlockProps({
      className: "course-cohorts-block-editor",
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
              label={__("Show Enrollment Count", "custom-theme")}
              checked={attributes.showEnrollmentCount ?? true}
              onChange={(showEnrollmentCount) =>
                setAttributes({ showEnrollmentCount })
              }
            />
            <TextControl
              label={__("CTA Text", "custom-theme")}
              value={attributes.ctaText || "Enroll"}
              onChange={(ctaText) => setAttributes({ ctaText })}
            />
          </PanelBody>
        </InspectorControls>

        <div className="course-cohorts-preview">
          <div className="components-placeholder">
            <div className="components-placeholder__label">
              🎯 Course Cohorts Block
            </div>
            <div className="components-placeholder__instructions">
              <p>
                Lists available cohorts for this course and provides an enroll
                CTA.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  },
  save: () => null,
});
