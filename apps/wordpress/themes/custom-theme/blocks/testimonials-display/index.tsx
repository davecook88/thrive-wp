import { registerBlockType } from "@wordpress/blocks";
import { useBlockProps, InspectorControls } from "@wordpress/block-editor";
import { PanelBody, SelectControl, RangeControl, ToggleControl } from "@wordpress/components";

interface Attrs {
  layout: "grid" | "carousel" | "list";
  columns: number;
  limit: number;
  teacherId: number;
  courseProgramId: number;
  minRating: number;
  featuredOnly: boolean;
  showRating: boolean;
  showDate: boolean;
}

registerBlockType<Attrs>("thrive/testimonials-display", {
  title: "Testimonials Display",
  category: "thrive",
  icon: "star-filled",
  attributes: {
    layout: { type: "string", default: "grid" },
    columns: { type: "number", default: 3 },
    limit: { type: "number", default: 6 },
    teacherId: { type: "number", default: 0 },
    courseProgramId: { type: "number", default: 0 },
    minRating: { type: "number", default: 1 },
    featuredOnly: { type: "boolean", default: false },
    showRating: { type: "boolean", default: true },
    showDate: { type: "boolean", default: true },
  },
  edit: ({ attributes, setAttributes }) => {
    const blockProps = useBlockProps();

    return (
      <div {...blockProps}>
        <InspectorControls>
          <PanelBody title="Display Settings">
            <SelectControl
              label="Layout"
              value={attributes.layout}
              options={[
                { label: "Grid", value: "grid" },
                { label: "Carousel", value: "carousel" },
                { label: "List", value: "list" },
              ]}
              onChange={(value) => setAttributes({ layout: value as "grid" | "carousel" | "list" })}
            />

            {attributes.layout === "grid" && (
              <RangeControl
                label="Columns"
                value={attributes.columns}
                onChange={(value) => setAttributes({ columns: value })}
                min={1}
                max={4}
              />
            )}

            <RangeControl
              label="Limit"
              value={attributes.limit}
              onChange={(value) => setAttributes({ limit: value })}
              min={1}
              max={20}
            />

            <RangeControl
              label="Minimum Rating"
              value={attributes.minRating}
              onChange={(value) => setAttributes({ minRating: value })}
              min={1}
              max={5}
            />
          </PanelBody>

          <PanelBody title="Filter Options">
            <ToggleControl
              label="Featured Only"
              checked={attributes.featuredOnly}
              onChange={(value) => setAttributes({ featuredOnly: value })}
            />

            <ToggleControl
              label="Show Rating"
              checked={attributes.showRating}
              onChange={(value) => setAttributes({ showRating: value })}
            />

            <ToggleControl
              label="Show Date"
              checked={attributes.showDate}
              onChange={(value) => setAttributes({ showDate: value })}
            />
          </PanelBody>
        </InspectorControls>

        <div style={{ border: "1px dashed #ccc", padding: 16, background: "#f9f9f9" }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 24, marginRight: 8 }}>⭐</span>
            <strong>Testimonials Display</strong>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: "#666" }}>
            Layout: {attributes.layout} | Limit: {attributes.limit} | Min Rating: {attributes.minRating}⭐
          </p>
          {attributes.featuredOnly && (
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "#0073aa" }}>
              Showing featured testimonials only
            </p>
          )}
        </div>
      </div>
    );
  },
  save: () => {
    return null; // Dynamic block - rendered via render.php
  },
});
