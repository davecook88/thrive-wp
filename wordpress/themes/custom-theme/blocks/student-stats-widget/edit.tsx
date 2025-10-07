import { InspectorControls, useBlockProps } from "@wordpress/block-editor";
import { PanelBody, ToggleControl } from "@wordpress/components";
import { __ } from "@wordpress/i18n";

export default function Edit({ attributes, setAttributes }: any) {
  const { showNextSession, showCompletedSessions, showScheduledSessions, showActiveCourses } =
    attributes;

  const blockProps = useBlockProps({
    className: "student-stats-widget-editor",
  });

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Display Settings", "custom-theme")}>
          <ToggleControl
            label={__("Show Next Session", "custom-theme")}
            checked={showNextSession}
            onChange={(value) => setAttributes({ showNextSession: value })}
          />
          <ToggleControl
            label={__("Show Completed Sessions", "custom-theme")}
            checked={showCompletedSessions}
            onChange={(value) => setAttributes({ showCompletedSessions: value })}
          />
          <ToggleControl
            label={__("Show Scheduled Sessions", "custom-theme")}
            checked={showScheduledSessions}
            onChange={(value) => setAttributes({ showScheduledSessions: value })}
          />
          <ToggleControl
            label={__("Show Active Courses", "custom-theme")}
            checked={showActiveCourses}
            onChange={(value) => setAttributes({ showActiveCourses: value })}
          />
        </PanelBody>
      </InspectorControls>

      <div {...blockProps}>
        <div className="student-stats-widget preview">
          <h4>Student Stats Widget</h4>
          <p style={{ fontSize: "12px", color: "#666" }}>
            Preview shown on frontend. Configure display options in the sidebar.
          </p>
          <div className="stat-cards-preview">
            {showNextSession && <div className="stat-card">Next Session</div>}
            {showCompletedSessions && <div className="stat-card">Classes Attended</div>}
            {showScheduledSessions && <div className="stat-card">Upcoming Sessions</div>}
            {showActiveCourses && <div className="stat-card">Active Courses</div>}
          </div>
        </div>
      </div>
    </>
  );
}
