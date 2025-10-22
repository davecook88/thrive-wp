import { registerBlockType } from "@wordpress/blocks";
import { useBlockProps, InspectorControls } from "@wordpress/block-editor";
import { PanelBody, TextControl, ToggleControl } from "@wordpress/components";
import { Fragment } from "@wordpress/element";
import ServerSideRender from "@wordpress/server-side-render";

interface PackageSelectionAttributes {
  showCredits: boolean;
  showDuration: boolean;
  showExpiry: boolean;
  loadingMessage: string;
  errorMessage: string;
  noPackagesMessage: string;
}

interface PackageSelectionBlockProps {
  attributes: PackageSelectionAttributes;
  setAttributes: (attrs: Partial<PackageSelectionAttributes>) => void;
  isSelected: boolean;
}

registerBlockType<PackageSelectionAttributes>(
  "custom-theme/package-selection",
  {
    title: "Package Selection",
    icon: "products",
    category: "widgets",
    description:
      "Display available packages for upselling during booking confirmation.",

    attributes: {
      showCredits: {
        type: "boolean",
        default: true,
      },
      showDuration: {
        type: "boolean",
        default: true,
      },
      showExpiry: {
        type: "boolean",
        default: true,
      },
      loadingMessage: {
        type: "string",
        default: "Loading available packages...",
      },
      errorMessage: {
        type: "string",
        default:
          "Unable to load packages at this time. Please refresh and try again.",
      },
      noPackagesMessage: {
        type: "string",
        default: "No packages are currently available.",
      },
    },

    edit: ({
      attributes,
      setAttributes,
      isSelected,
    }: PackageSelectionBlockProps) => {
      const blockProps = useBlockProps();

      return (
        <Fragment>
          <div {...blockProps}>
            <ServerSideRender
              block="custom-theme/package-selection"
              attributes={attributes}
            />
          </div>

          {isSelected && (
            <InspectorControls>
              <PanelBody title="Display Options" initialOpen={true}>
                <ToggleControl
                  label="Show Credits"
                  checked={attributes.showCredits}
                  onChange={(value) => setAttributes({ showCredits: value })}
                />
                <ToggleControl
                  label="Show Session Duration"
                  checked={attributes.showDuration}
                  onChange={(value) => setAttributes({ showDuration: value })}
                />
                <ToggleControl
                  label="Show Expiry"
                  checked={attributes.showExpiry}
                  onChange={(value) => setAttributes({ showExpiry: value })}
                />
              </PanelBody>

              <PanelBody title="Messages" initialOpen={false}>
                <TextControl
                  label="Loading Message"
                  value={attributes.loadingMessage}
                  onChange={(value) => setAttributes({ loadingMessage: value })}
                />
                <TextControl
                  label="Error Message"
                  value={attributes.errorMessage}
                  onChange={(value) => setAttributes({ errorMessage: value })}
                />
                <TextControl
                  label="No Packages Message"
                  value={attributes.noPackagesMessage}
                  onChange={(value) =>
                    setAttributes({ noPackagesMessage: value })
                  }
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
  },
);
