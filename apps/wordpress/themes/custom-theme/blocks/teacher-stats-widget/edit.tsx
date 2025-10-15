import { useBlockProps, InspectorControls } from "@wordpress/block-editor";
import { PanelBody, ToggleControl } from "@wordpress/components";

interface EditProps {
  attributes: {
    showNextSession: boolean;
    showCompletedSessions: boolean;
    showScheduledSessions: boolean;
    showActiveStudents: boolean;
  };
  setAttributes: (attrs: Partial<EditProps["attributes"]>) => void;
}

export default function Edit({ attributes, setAttributes }: EditProps) {
  const blockProps = useBlockProps();

  return (
    <>
      <InspectorControls>
        <PanelBody title="Display Settings">
          <ToggleControl
            label="Show Next Session"
            checked={attributes.showNextSession}
            onChange={(value) => setAttributes({ showNextSession: value })}
          />
          <ToggleControl
            label="Show Completed Sessions"
            checked={attributes.showCompletedSessions}
            onChange={(value) =>
              setAttributes({ showCompletedSessions: value })
            }
          />
          <ToggleControl
            label="Show Scheduled Sessions"
            checked={attributes.showScheduledSessions}
            onChange={(value) =>
              setAttributes({ showScheduledSessions: value })
            }
          />
          <ToggleControl
            label="Show Active Students"
            checked={attributes.showActiveStudents}
            onChange={(value) => setAttributes({ showActiveStudents: value })}
          />
        </PanelBody>
      </InspectorControls>
      <div {...blockProps}>
        <div style={{ padding: "20px", background: "#f0f0f0", borderRadius: "4px" }}>
          <h3>Teacher Stats Widget</h3>
          <p>This block will display teacher statistics on the frontend.</p>
          <ul>
            {attributes.showNextSession && <li>✓ Next Session</li>}
            {attributes.showCompletedSessions && <li>✓ Classes Taught</li>}
            {attributes.showScheduledSessions && <li>✓ Upcoming Sessions</li>}
            {attributes.showActiveStudents && <li>✓ Active Students</li>}
          </ul>
        </div>
      </div>
    </>
  );
}
