import { registerBlockType } from "@wordpress/blocks";
import { useBlockProps, InspectorControls } from "@wordpress/block-editor";
import {
  PanelBody,
  TextControl,
  SelectControl,
  ToggleControl,
} from "@wordpress/components";
import { Fragment } from "@wordpress/element";
import ServerSideRender from "@wordpress/server-side-render";

interface LoginAuthBlockProps {
  attributes: {
    signInText: string;
    signOutText: string;
    buttonStyle: "outline" | "solid" | "rounded";
    buttonAlign: "left" | "center" | "right";
    buttonColor: "primary" | "secondary" | "tertiary";
    modalTitle: string;
    modalDescription: string;
    showGoogle: boolean;
    showEmail: boolean;
    emailLabel: string;
    passwordLabel: string;
    extraClass: string;
  };
  setAttributes: (attrs: any) => void;
  isSelected: boolean;
}
registerBlockType("thrive/login-auth", {
  name: "thrive/login-auth",
  title: "Login/Auth Button",
  category: "widgets",
  attributes: {
    signInText: { type: "string", default: "Sign In" },
    signOutText: { type: "string", default: "Sign Out" },
    buttonColor: { type: "string", default: "blue" },
    buttonStyle: { type: "string", default: "outline" },
    buttonAlign: { type: "string", default: "left" },
    modalTitle: { type: "string", default: "Sign In" },
    modalDescription: { type: "string", default: "" },
    showGoogle: { type: "boolean", default: true },
    showEmail: { type: "boolean", default: true },
    emailLabel: { type: "string", default: "Email" },
    passwordLabel: { type: "string", default: "Password" },
    extraClass: { type: "string", default: "" },
  },
  edit: function (props: LoginAuthBlockProps) {
    const { attributes, setAttributes, isSelected } = props;
    const blockProps = useBlockProps();

    return (
      <div {...blockProps}>
        <InspectorControls>
          <PanelBody title="Button Settings" initialOpen={true}>
            <TextControl
              label="Sign In Button Text"
              value={attributes.signInText}
              onChange={(v) => setAttributes({ signInText: v })}
            />
            <TextControl
              label="Sign Out Button Text"
              value={attributes.signOutText}
              onChange={(v) => setAttributes({ signOutText: v })}
            />
            <SelectControl
              label="Button Style"
              value={attributes.buttonStyle}
              options={[
                { label: "Outline", value: "outline" },
                { label: "Solid", value: "solid" },
                { label: "Rounded", value: "rounded" },
              ]}
              onChange={(v) => setAttributes({ buttonStyle: v })}
            />
            <SelectControl
              label="Button Color"
              value={attributes.buttonColor}
              options={[
                { label: "Primary", value: "primary" },
                { label: "Secondary", value: "secondary" },
                { label: "Tertiary", value: "tertiary" },
              ]}
              onChange={(v) => setAttributes({ buttonColor: v })}
            />
            <SelectControl
              label="Button Alignment"
              value={attributes.buttonAlign}
              options={[
                { label: "Left", value: "left" },
                { label: "Center", value: "center" },
                { label: "Right", value: "right" },
              ]}
              onChange={(v) => setAttributes({ buttonAlign: v })}
            />
          </PanelBody>
          <PanelBody title="Modal Settings" initialOpen={false}>
            <TextControl
              label="Modal Title"
              value={attributes.modalTitle}
              onChange={(v) => setAttributes({ modalTitle: v })}
            />
            <TextControl
              label="Modal Description"
              value={attributes.modalDescription}
              onChange={(v) => setAttributes({ modalDescription: v })}
            />
          </PanelBody>
          <PanelBody title="Providers" initialOpen={false}>
            <ToggleControl
              label="Show Google Login"
              checked={!!attributes.showGoogle}
              onChange={(v) => setAttributes({ showGoogle: v })}
            />
            <ToggleControl
              label="Show Email Login"
              checked={!!attributes.showEmail}
              onChange={(v) => setAttributes({ showEmail: v })}
            />
          </PanelBody>
          <PanelBody title="Field Labels" initialOpen={false}>
            <TextControl
              label="Email Label"
              value={attributes.emailLabel}
              onChange={(v) => setAttributes({ emailLabel: v })}
            />
            <TextControl
              label="Password Label"
              value={attributes.passwordLabel}
              onChange={(v) => setAttributes({ passwordLabel: v })}
            />
          </PanelBody>
          <PanelBody title="Advanced" initialOpen={false}>
            <TextControl
              label="Extra CSS Class"
              value={attributes.extraClass}
              onChange={(v) => setAttributes({ extraClass: v })}
            />
          </PanelBody>
        </InspectorControls>
        <Fragment>
          <ServerSideRender block="thrive/login-auth" attributes={attributes} />
          {isSelected && (
            <div
              style={{
                border: "1px dashed #888",
                padding: "8px",
                marginTop: "8px",
                background: "#fff8",
                fontSize: "12px",
                textAlign: "center",
              }}
            >
              You can set background and text color for this block using the
              block settings panel.
            </div>
          )}
        </Fragment>
      </div>
    );
  },
  save: function () {
    return null; // Server rendered
  },
});
