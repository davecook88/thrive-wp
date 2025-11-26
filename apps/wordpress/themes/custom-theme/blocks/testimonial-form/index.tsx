import { registerBlockType } from "@wordpress/blocks";
import { useBlockProps, InspectorControls } from "@wordpress/block-editor";
import { PanelBody, ToggleControl, TextareaControl } from "@wordpress/components";
import type { BlockEditProps } from "@wordpress/blocks";
import metadata from "./block.json";

interface TestimonialFormAttributes {
  showMyTestimonials: boolean;
  allowGeneralTestimonials: boolean;
  thankYouMessage: string;
}

function Edit({ attributes, setAttributes }: BlockEditProps<TestimonialFormAttributes>) {
  const blockProps = useBlockProps();

  return (
    <>
      <InspectorControls>
        <PanelBody title="Form Settings">
          <ToggleControl
            label="Show My Testimonials Section"
            help="Display student's existing testimonials below the form"
            checked={attributes.showMyTestimonials}
            onChange={(showMyTestimonials) => setAttributes({ showMyTestimonials })}
          />
          <ToggleControl
            label="Allow General Testimonials"
            help="Allow students to submit general testimonials about the school"
            checked={attributes.allowGeneralTestimonials}
            onChange={(allowGeneralTestimonials) => setAttributes({ allowGeneralTestimonials })}
          />
          <TextareaControl
            label="Thank You Message"
            help="Message shown after successful submission"
            value={attributes.thankYouMessage}
            onChange={(thankYouMessage) => setAttributes({ thankYouMessage })}
          />
        </PanelBody>
      </InspectorControls>

      <div {...blockProps}>
        <div style={{
          border: "2px dashed #ccc",
          borderRadius: "8px",
          padding: "40px",
          textAlign: "center",
          backgroundColor: "#f9fafb",
        }}>
          <span style={{ fontSize: "48px", display: "block", marginBottom: "16px" }}>⭐</span>
          <h3 style={{ marginBottom: "8px" }}>Testimonial Submission Form</h3>
          <p style={{ color: "#6b7280", marginBottom: "16px" }}>
            Students can submit testimonials for teachers, courses, or the school in general
          </p>
          <div style={{ fontSize: "14px", color: "#4b5563" }}>
            <p>✓ {attributes.showMyTestimonials ? "Shows" : "Hides"} student's existing testimonials</p>
            <p>✓ {attributes.allowGeneralTestimonials ? "Allows" : "Blocks"} general testimonials</p>
          </div>
        </div>
      </div>
    </>
  );
}

registerBlockType(metadata.name, {
  // @ts-ignore
  edit: Edit,
});
