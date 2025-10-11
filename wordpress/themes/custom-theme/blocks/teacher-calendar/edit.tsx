import { useBlockProps, InspectorControls } from "@wordpress/block-editor";
import { PanelBody, SelectControl, RangeControl } from "@wordpress/components";

interface EditProps {
  attributes: {
    view: string;
    slotDuration: number;
    snapTo: number;
    viewHeight: number;
  };
  setAttributes: (attrs: Partial<EditProps["attributes"]>) => void;
}

export default function Edit({ attributes, setAttributes }: EditProps) {
  const blockProps = useBlockProps();

  return (
    <>
      <InspectorControls>
        <PanelBody title="Calendar Settings">
          <SelectControl
            label="View Type"
            value={attributes.view}
            options={[
              { label: "Week", value: "week" },
              { label: "Day", value: "day" },
              { label: "Month", value: "month" },
            ]}
            onChange={(value) => setAttributes({ view: value })}
          />
          <RangeControl
            label="Slot Duration (minutes)"
            value={attributes.slotDuration}
            onChange={(value) => setAttributes({ slotDuration: value || 30 })}
            min={15}
            max={60}
            step={15}
          />
          <RangeControl
            label="Snap To (minutes)"
            value={attributes.snapTo}
            onChange={(value) => setAttributes({ snapTo: value || 15 })}
            min={5}
            max={60}
            step={5}
          />
          <RangeControl
            label="View Height (pixels)"
            value={attributes.viewHeight}
            onChange={(value) => setAttributes({ viewHeight: value || 600 })}
            min={400}
            max={1000}
            step={50}
          />
        </PanelBody>
      </InspectorControls>
      <div {...blockProps}>
        <div
          style={{
            padding: "20px",
            background: "#f0f0f0",
            borderRadius: "4px",
          }}
        >
          <h3>Teacher Calendar</h3>
          <p>
            This block will display a calendar with two modes on the frontend:
          </p>
          <ul>
            <li>My Classes - View scheduled classes with students</li>
            <li>Set Availability - View availability windows</li>
          </ul>
          <p>
            <strong>View:</strong> {attributes.view}
            <br />
            <strong>Slot Duration:</strong> {attributes.slotDuration} minutes
            <br />
            <strong>Height:</strong> {attributes.viewHeight}px
          </p>
        </div>
      </div>
    </>
  );
}
