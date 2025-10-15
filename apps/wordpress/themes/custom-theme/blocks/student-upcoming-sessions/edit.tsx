import { InspectorControls, useBlockProps } from "@wordpress/block-editor";
import { PanelBody, RangeControl, ToggleControl } from "@wordpress/components";
import { __ } from "@wordpress/i18n";

export default function Edit({ attributes, setAttributes }: any) {
  const { limit, showMeetingLinks } = attributes;

  const blockProps = useBlockProps({
    className: "student-upcoming-sessions-editor",
  });

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Display Settings", "custom-theme")}>
          <RangeControl
            label={__("Number of Sessions to Show", "custom-theme")}
            value={limit}
            onChange={(value) => setAttributes({ limit: value })}
            min={1}
            max={20}
          />
          <ToggleControl
            label={__("Show Meeting Links", "custom-theme")}
            checked={showMeetingLinks}
            onChange={(value) => setAttributes({ showMeetingLinks: value })}
          />
        </PanelBody>
      </InspectorControls>

      <div {...blockProps}>
        <div className="student-upcoming-sessions preview">
          <h4>Upcoming Sessions</h4>
          <p style={{ fontSize: "12px", color: "#666" }}>
            Shows next {limit} upcoming sessions. Configure in sidebar.
          </p>
          <div className="preview-sessions">
            {[1, 2, 3].slice(0, Math.min(3, limit)).map((i) => (
              <div key={i} className="preview-session-card">
                <div>📅 Session {i}</div>
                <small>Teacher Name • Type</small>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
