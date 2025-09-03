import { registerBlockType } from "@wordpress/blocks";
import {
  useBlockProps,
  InnerBlocks,
  InspectorControls,
} from "@wordpress/block-editor";
import { PanelBody, SelectControl } from "@wordpress/components";
import { __ } from "@wordpress/i18n";

interface Attributes {
  selectedTeacherId?: string;
  heading?: string;
}

registerBlockType<Attributes>("custom-theme/teacher-availability-wrapper", {
  title: __("Teacher Availability (Wrapper)", "custom-theme"),
  icon: "columns",
  category: "widgets",
  attributes: {
    selectedTeacherId: { type: "string" },
    heading: { type: "string", default: "Teacher Availability" },
  },
  edit: ({ attributes, setAttributes }) => {
    const blockProps = useBlockProps();
    const { selectedTeacherId, heading } = attributes;

    // TODO: fetch teacher list via REST - minimal static fallback for now
    const options = [
      { label: "Choose a teacher", value: "" },
      { label: "You (current)", value: "me" },
    ];

    return (
      <div {...blockProps}>
        <InspectorControls>
          <PanelBody title={__("Wrapper Settings", "custom-theme")}>
            <SelectControl
              label={__("Teacher", "custom-theme")}
              value={selectedTeacherId}
              options={options}
              onChange={(v) => setAttributes({ selectedTeacherId: v })}
            />
          </PanelBody>
        </InspectorControls>

        <div style={{ border: "1px dashed #e5e7eb", padding: "1rem" }}>
          <strong>{heading}</strong>
          <div style={{ marginTop: "0.75rem" }}>
            <InnerBlocks
              templateLock={false}
              allowedBlocks={[
                "custom-theme/teacher-availability",
                "custom-theme/thrive-calendar",
              ]}
              template={[
                ["custom-theme/teacher-availability", {}],
                ["custom-theme/thrive-calendar", {}],
              ]}
            />
          </div>
        </div>
      </div>
    );
  },
  save: ({ attributes }) => {
    const wrapperProps = useBlockProps.save({
      className: "wp-block-custom-theme-teacher-availability-wrapper",
    } as any);
    return (
      <div {...wrapperProps}>
        <InnerBlocks.Content />
      </div>
    );
  },
});
