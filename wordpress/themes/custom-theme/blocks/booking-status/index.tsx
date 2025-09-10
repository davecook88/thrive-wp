import { registerBlockType } from "@wordpress/blocks";
import { useBlockProps, InspectorControls } from "@wordpress/block-editor";
import { PanelBody, TextControl } from "@wordpress/components";
import { Fragment } from "@wordpress/element";
import ServerSideRender from "@wordpress/server-side-render";

interface BookingStatusAttributes {
  successTitle: string;
  successMessage: string;
  failureTitle: string;
  failureMessage: string;
  pendingTitle: string;
  pendingMessage: string;
}

interface BookingStatusBlockProps {
  attributes: BookingStatusAttributes;
  setAttributes: (attrs: Partial<BookingStatusAttributes>) => void;
  isSelected: boolean;
}

registerBlockType<BookingStatusAttributes>("custom-theme/booking-status", {
  title: "Booking Status",
  icon: "yes",
  category: "widgets",
  description:
    "Display booking completion status based on Stripe payment parameters.",

  attributes: {
    successTitle: {
      type: "string",
      default: "Booking Confirmed!",
    },
    successMessage: {
      type: "string",
      default:
        "Your booking has been successfully confirmed and payment processed.",
    },
    failureTitle: {
      type: "string",
      default: "Booking Failed",
    },
    failureMessage: {
      type: "string",
      default:
        "There was an issue processing your booking. Please try again or contact support.",
    },
    pendingTitle: {
      type: "string",
      default: "Processing Payment",
    },
    pendingMessage: {
      type: "string",
      default: "Please wait while we process your payment...",
    },
  },

  edit: ({
    attributes,
    setAttributes,
    isSelected,
  }: BookingStatusBlockProps) => {
    const blockProps = useBlockProps();

    return (
      <Fragment>
        <div {...blockProps}>
          <ServerSideRender
            block="custom-theme/booking-status"
            attributes={attributes}
          />
        </div>

        {isSelected && (
          <InspectorControls>
            <PanelBody title="Success State" initialOpen={true}>
              <TextControl
                label="Success Title"
                value={attributes.successTitle}
                onChange={(value) => setAttributes({ successTitle: value })}
              />
              <TextControl
                label="Success Message"
                value={attributes.successMessage}
                onChange={(value) => setAttributes({ successMessage: value })}
              />
            </PanelBody>

            <PanelBody title="Failure State" initialOpen={false}>
              <TextControl
                label="Failure Title"
                value={attributes.failureTitle}
                onChange={(value) => setAttributes({ failureTitle: value })}
              />
              <TextControl
                label="Failure Message"
                value={attributes.failureMessage}
                onChange={(value) => setAttributes({ failureMessage: value })}
              />
            </PanelBody>

            <PanelBody title="Pending State" initialOpen={false}>
              <TextControl
                label="Pending Title"
                value={attributes.pendingTitle}
                onChange={(value) => setAttributes({ pendingTitle: value })}
              />
              <TextControl
                label="Pending Message"
                value={attributes.pendingMessage}
                onChange={(value) => setAttributes({ pendingMessage: value })}
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
