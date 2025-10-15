import { registerBlockType } from "@wordpress/blocks";
import { useBlockProps, InspectorControls } from "@wordpress/block-editor";
import { PanelBody, TextControl, ToggleControl } from "@wordpress/components";
import { Fragment } from "@wordpress/element";
import ConditionalStripePaymentComponent from "./ConditionalStripePaymentComponent";

interface ConditionalStripePaymentAttributes {
  heading: string;
  selectPackageMessage: string;
  confirmButtonText: string;
  cancelButtonText: string;
  loadingText: string;
  showBackLink: boolean;
  backLinkUrl: string;
  backLinkText: string;
}

interface ConditionalStripePaymentBlockProps {
  attributes: ConditionalStripePaymentAttributes;
  setAttributes: (attrs: Partial<ConditionalStripePaymentAttributes>) => void;
  isSelected: boolean;
  context?: {
    "custom-theme/bookingStart"?: string;
    "custom-theme/bookingEnd"?: string;
    "custom-theme/teacherId"?: string;
    "custom-theme/selectedPackageId"?: string;
    "custom-theme/selectedPriceId"?: string;
    "custom-theme/selectedPackageName"?: string;
  };
}

registerBlockType<ConditionalStripePaymentAttributes>(
  "custom-theme/conditional-stripe-payment",
  {
    title: "Conditional Stripe Payment",
    icon: "money-alt",
    category: "widgets",
    description: "Display Stripe payment form only when a package is selected.",

    attributes: {
      heading: {
        type: "string",
        default: "Complete Your Payment",
      },
      selectPackageMessage: {
        type: "string",
        default: "Please select a package above to continue with payment.",
      },
      confirmButtonText: {
        type: "string",
        default: "Confirm and Pay",
      },
      cancelButtonText: {
        type: "string",
        default: "Cancel",
      },
      loadingText: {
        type: "string",
        default: "Preparing secure payment...",
      },
      showBackLink: {
        type: "boolean",
        default: true,
      },
      backLinkUrl: {
        type: "string",
        default: "/booking",
      },
      backLinkText: {
        type: "string",
        default: "Back to Calendar",
      },
    },

    edit: ({
      attributes,
      setAttributes,
      isSelected,
      context,
    }: ConditionalStripePaymentBlockProps) => {
      const blockProps = useBlockProps();

      return (
        <Fragment>
          <div {...blockProps}>
            <ConditionalStripePaymentComponent
              attributes={attributes}
              context={context}
            />
          </div>

          {isSelected && (
            <InspectorControls>
              <PanelBody title="Content Settings" initialOpen={true}>
                <TextControl
                  label="Heading"
                  value={attributes.heading}
                  onChange={(value) => setAttributes({ heading: value })}
                />
                <TextControl
                  label="Select Package Message"
                  value={attributes.selectPackageMessage}
                  onChange={(value) =>
                    setAttributes({ selectPackageMessage: value })
                  }
                  help="Message shown when no package is selected."
                />
              </PanelBody>

              <PanelBody title="Button Settings" initialOpen={false}>
                <TextControl
                  label="Confirm Button Text"
                  value={attributes.confirmButtonText}
                  onChange={(value) =>
                    setAttributes({ confirmButtonText: value })
                  }
                />
                <TextControl
                  label="Cancel Button Text"
                  value={attributes.cancelButtonText}
                  onChange={(value) =>
                    setAttributes({ cancelButtonText: value })
                  }
                />
                <TextControl
                  label="Loading Text"
                  value={attributes.loadingText}
                  onChange={(value) => setAttributes({ loadingText: value })}
                />
              </PanelBody>

              <PanelBody title="Navigation" initialOpen={false}>
                <ToggleControl
                  label="Show Back Link"
                  checked={attributes.showBackLink}
                  onChange={(value) => setAttributes({ showBackLink: value })}
                />
                {attributes.showBackLink && (
                  <>
                    <TextControl
                      label="Back Link URL"
                      value={attributes.backLinkUrl}
                      onChange={(value) =>
                        setAttributes({ backLinkUrl: value })
                      }
                    />
                    <TextControl
                      label="Back Link Text"
                      value={attributes.backLinkText}
                      onChange={(value) =>
                        setAttributes({ backLinkText: value })
                      }
                    />
                  </>
                )}
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
  }
);
