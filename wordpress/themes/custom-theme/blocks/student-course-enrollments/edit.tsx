import { InspectorControls, useBlockProps } from "@wordpress/block-editor";
import { PanelBody, ToggleControl } from "@wordpress/components";
import { __ } from "@wordpress/i18n";

export default function Edit({ attributes, setAttributes }: any) {
  const { showProgress, showNextSession } = attributes;

  const blockProps = useBlockProps({
    className: "student-course-enrollments-editor",
  });

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Display Settings", "custom-theme")}>
          <ToggleControl
            label={__("Show Progress Bars", "custom-theme")}
            checked={showProgress}
            onChange={(value) => setAttributes({ showProgress: value })}
          />
          <ToggleControl
            label={__("Show Next Session", "custom-theme")}
            checked={showNextSession}
            onChange={(value) => setAttributes({ showNextSession: value })}
          />
        </PanelBody>
      </InspectorControls>

      <div {...blockProps}>
        <div className="student-course-enrollments preview">
          <h4>My Courses</h4>
          <p style={{ fontSize: "12px", color: "#666" }}>
            Shows active course enrollments with progress. Configure in sidebar.
          </p>
          <div className="preview-course-card">
            <div>📚 Course Name</div>
            {showProgress && (
              <div style={{ marginTop: "8px" }}>
                <div
                  style={{
                    background: "#ddd",
                    height: "8px",
                    borderRadius: "4px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      background: "#007cba",
                      height: "100%",
                      width: "45%",
                    }}
                  ></div>
                </div>
                <small>5 of 12 sessions completed</small>
              </div>
            )}
            {showNextSession && (
              <div style={{ marginTop: "8px" }}>
                <small>Next session: Oct 7, 2:00 PM</small>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
