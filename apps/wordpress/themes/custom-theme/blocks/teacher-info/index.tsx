import { registerBlockType } from "@wordpress/blocks";
import { __ } from "@wordpress/i18n";
import { InspectorControls, useBlockProps } from "@wordpress/block-editor";
import {
  PanelBody,
  SelectControl,
  ToggleControl,
  TextControl,
  __experimentalNumberControl as NumberControl,
} from "@wordpress/components";

interface Attrs {
  teacherId?: number | null;
  layout?: "horizontal" | "vertical" | "card";
  size?: "small" | "medium" | "large";
  showAvatar?: boolean;
  showLocation?: boolean;
  showBio?: boolean;
  showSpecialties?: boolean;
  showStats?: boolean;
  showMap?: boolean;
  backgroundColor?: string;
  borderRadius?: string;
}

registerBlockType<Attrs>("custom-theme/teacher-info", {
  title: __("Teacher Info", "custom-theme"),
  icon: "id-alt",
  category: "widgets",
  attributes: {
    teacherId: { type: "number", default: undefined },
    layout: { type: "string", default: "horizontal" },
    size: { type: "string", default: "medium" },
    showAvatar: { type: "boolean", default: true },
    showLocation: { type: "boolean", default: true },
    showBio: { type: "boolean", default: true },
    showSpecialties: { type: "boolean", default: true },
    showStats: { type: "boolean", default: false },
    showMap: { type: "boolean", default: false },
    backgroundColor: { type: "string", default: "" },
    borderRadius: { type: "string", default: "8px" },
  },
  edit: ({ attributes, setAttributes }) => {
    const blockProps = useBlockProps({ className: "thrive-teacher-info" });
    const {
      teacherId,
      layout,
      size,
      showAvatar,
      showLocation,
      showBio,
      showSpecialties,
      showStats,
      showMap,
      backgroundColor,
      borderRadius,
    } = attributes;

    return (
      <div {...blockProps}>
        <InspectorControls>
          <PanelBody title={__("Teacher Selection", "custom-theme")}>
            <NumberControl
              label={__("Teacher ID (optional)", "custom-theme")}
              help={__(
                "Leave empty to use the selected teacher from calendar context.",
                "custom-theme"
              )}
              value={teacherId ?? ""}
              onChange={(value) =>
                setAttributes({
                  teacherId: value ? parseInt(value as string, 10) : null,
                })
              }
            />
          </PanelBody>

          <PanelBody title={__("Layout Settings", "custom-theme")}>
            <SelectControl
              label={__("Layout", "custom-theme")}
              value={layout}
              options={[
                {
                  label: __("Horizontal", "custom-theme"),
                  value: "horizontal",
                },
                { label: __("Vertical", "custom-theme"), value: "vertical" },
                { label: __("Card", "custom-theme"), value: "card" },
              ]}
              onChange={(value) =>
                setAttributes({ layout: value as typeof layout })
              }
            />
            <SelectControl
              label={__("Size", "custom-theme")}
              value={size}
              options={[
                { label: __("Small", "custom-theme"), value: "small" },
                { label: __("Medium", "custom-theme"), value: "medium" },
                { label: __("Large", "custom-theme"), value: "large" },
              ]}
              onChange={(value) =>
                setAttributes({ size: value as typeof size })
              }
            />
          </PanelBody>

          <PanelBody title={__("Display Options", "custom-theme")}>
            <ToggleControl
              label={__("Show Avatar", "custom-theme")}
              checked={!!showAvatar}
              onChange={(value) => setAttributes({ showAvatar: value })}
            />
            <ToggleControl
              label={__("Show Location", "custom-theme")}
              checked={!!showLocation}
              onChange={(value) => setAttributes({ showLocation: value })}
            />
            <ToggleControl
              label={__("Show Bio", "custom-theme")}
              checked={!!showBio}
              onChange={(value) => setAttributes({ showBio: value })}
            />
            <ToggleControl
              label={__("Show Specialties", "custom-theme")}
              checked={!!showSpecialties}
              onChange={(value) => setAttributes({ showSpecialties: value })}
            />
            <ToggleControl
              label={__("Show Stats (years, languages)", "custom-theme")}
              checked={!!showStats}
              onChange={(value) => setAttributes({ showStats: value })}
            />
            <ToggleControl
              label={__("Show Map", "custom-theme")}
              checked={!!showMap}
              onChange={(value) => setAttributes({ showMap: value })}
            />
          </PanelBody>

          <PanelBody title={__("Styling", "custom-theme")}>
            <TextControl
              label={__("Background Color", "custom-theme")}
              value={backgroundColor || ""}
              onChange={(value) => setAttributes({ backgroundColor: value })}
              help={__(
                "CSS color value (e.g., #ffffff, transparent)",
                "custom-theme"
              )}
            />
            <TextControl
              label={__("Border Radius", "custom-theme")}
              value={borderRadius || ""}
              onChange={(value) => setAttributes({ borderRadius: value })}
              help={__("CSS border-radius value (e.g., 8px)", "custom-theme")}
            />
          </PanelBody>
        </InspectorControls>

        <div
          style={{
            border: "1px dashed #e5e7eb",
            padding: 16,
            borderRadius: borderRadius || "8px",
            backgroundColor: backgroundColor || "#f9fafb",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {showAvatar && (
              <div
                style={{
                  width: size === "small" ? 40 : size === "large" ? 80 : 60,
                  height: size === "small" ? 40 : size === "large" ? 80 : 60,
                  borderRadius: "50%",
                  background: "#e5e7eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                👤
              </div>
            )}
            <div style={{ flex: 1 }}>
              <strong>Teacher Info Block</strong>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                {teacherId
                  ? `Displaying teacher ID: ${teacherId}`
                  : "Will use selected teacher from calendar context"}
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                Layout: {layout} | Size: {size}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
  save: ({ attributes }) => {
    const props = useBlockProps.save({
      className: "thrive-teacher-info",
    });
    return (
      <div
        {...props}
        data-teacher-id={attributes.teacherId || ""}
        data-layout={attributes.layout}
        data-size={attributes.size}
        data-show-avatar={attributes.showAvatar ? "1" : "0"}
        data-show-location={attributes.showLocation ? "1" : "0"}
        data-show-bio={attributes.showBio ? "1" : "0"}
        data-show-specialties={attributes.showSpecialties ? "1" : "0"}
        data-show-stats={attributes.showStats ? "1" : "0"}
        data-show-map={attributes.showMap ? "1" : "0"}
        data-background-color={attributes.backgroundColor || ""}
        data-border-radius={attributes.borderRadius || "8px"}
      ></div>
    );
  },
});
