import { InspectorControls, useBlockProps } from "@wordpress/block-editor";
import { PanelBody, SelectControl, ToggleControl } from "@wordpress/components";
import { __ } from "@wordpress/i18n";

export default function Edit({ attributes, setAttributes }: any) {
  const { viewMode, showExpired } = attributes;

  const blockProps = useBlockProps({
    className: "student-package-details-editor",
  });

  return (
    <>
      <InspectorControls>
        <PanelBody title={__("Display Settings", "custom-theme")}>
          <SelectControl
            label={__("View Mode", "custom-theme")}
            value={viewMode}
            options={[
              { label: "Detailed", value: "detailed" },
              { label: "Compact", value: "compact" },
            ]}
            onChange={(value) => setAttributes({ viewMode: value })}
          />
          <ToggleControl
            label={__("Show Expired Packages", "custom-theme")}
            checked={showExpired}
            onChange={(value) => setAttributes({ showExpired: value })}
          />
        </PanelBody>
      </InspectorControls>

      <div {...blockProps}>
        <div className="student-package-details preview">
          <h4>Student Package Details</h4>
          <p style={{ fontSize: "12px", color: "#666" }}>
            Shows active packages with progress bars. Configure view mode in sidebar.
          </p>
          <div className="preview-card">
            <div>📦 Package Name</div>
            <div style={{ marginTop: "8px" }}>
              <div
                style={{
                  background: "#ddd",
                  height: "8px",
                  borderRadius: "4px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    background: "#007cba",
                    height: "100%",
                    width: "60%",
                  }}
                ></div>
              </div>
              <small>6 of 10 sessions remaining</small>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
