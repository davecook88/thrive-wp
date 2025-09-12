import { registerBlockType } from "@wordpress/blocks";
import { useBlockProps, InspectorControls } from "@wordpress/block-editor";
import { PanelBody, TextControl, ToggleControl } from "@wordpress/components";
import { Fragment } from "@wordpress/element";
import ServerSideRender from "@wordpress/server-side-render";

interface BookingSessionDetailsAttributes {
  heading: string;
  showTeacherName: boolean;
  showDateTime: boolean;
  dateTimeFormat: string;
  errorMessage: string;
}

interface BookingSessionDetailsBlockProps {
  attributes: BookingSessionDetailsAttributes;
  setAttributes: (attrs: Partial<BookingSessionDetailsAttributes>) => void;
  isSelected: boolean;
}

registerBlockType<BookingSessionDetailsAttributes>("custom-theme/booking-session-details", {
  title: "Booking Session Details",
  icon: "calendar-alt",
  category: "widgets",
  description: "Display session details with merge fields for booking confirmation.",

  attributes: {
    heading: {
      type: "string",
      default: "Session Details",
    },
    showTeacherName: {
      type: "boolean",
      default: true,
    },
    showDateTime: {
      type: "boolean",
      default: true,
    },
    dateTimeFormat: {
      type: "string",
      default: "F j, Y g:i A T",
    },
    errorMessage: {
      type: "string",
      default: "Please ensure you have valid booking details in your URL.",
    },
  },

  edit: ({
    attributes,
    setAttributes,
    isSelected,
  }: BookingSessionDetailsBlockProps) => {
    const blockProps = useBlockProps();

    return (
      <Fragment>
        <div {...blockProps}>
          <ServerSideRender
            block="custom-theme/booking-session-details"
            attributes={attributes}
          />
        </div>

        {isSelected && (
          <InspectorControls>
            <PanelBody title="Display Settings" initialOpen={true}>
              <TextControl
                label="Heading"
                value={attributes.heading}
                onChange={(value) => setAttributes({ heading: value })}
                help="The heading text displayed above the session details."
              />
              <ToggleControl
                label="Show Teacher Name"
                checked={attributes.showTeacherName}
                onChange={(value) => setAttributes({ showTeacherName: value })}
              />
              <ToggleControl
                label="Show Date & Time"
                checked={attributes.showDateTime}
                onChange={(value) => setAttributes({ showDateTime: value })}
              />
              <TextControl
                label="Date Time Format"
                value={attributes.dateTimeFormat}
                onChange={(value) => setAttributes({ dateTimeFormat: value })}
                help="PHP date format string for displaying date/time."
              />
            </PanelBody>

            <PanelBody title="Error Handling" initialOpen={false}>
              <TextControl
                label="Error Message"
                value={attributes.errorMessage}
                onChange={(value) => setAttributes({ errorMessage: value })}
                help="Message shown when booking details are missing or invalid."
              />
            </PanelBody>
          </InspectorControls>
        )}
      </Fragment>
    );
  },

  save: () => {
    // This block is rendered server-side, so return null
    return null;
  },
});