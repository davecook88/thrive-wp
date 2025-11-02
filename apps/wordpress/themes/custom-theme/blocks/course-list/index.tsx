import { registerBlockType } from "@wordpress/blocks";
import { __ } from "@wordpress/i18n";
import {
  PanelBody,
  RangeControl,
  ToggleControl,
  SelectControl,
  TextControl,
  RadioControl,
} from "@wordpress/components";
import { InspectorControls, useBlockProps } from "@wordpress/block-editor";

type Attrs = {
  columns?: number;
  showLevelBadges?: boolean;
  showPrice?: boolean;
  showEnrollmentCount?: boolean;
  showCohortInfo?: boolean;
  showDescription?: boolean;
  cardLayout?: "image-top" | "image-side";
  sortBy?: "startDate" | "title" | "price";
  sortOrder?: "asc" | "desc";
  showFilters?: boolean;
  defaultLevelId?: number | null;
  pageSize?: number;
  showPagination?: boolean;
  imagePlaceholder?: string;
};

registerBlockType<Attrs>("custom-theme/course-list", {
  title: __("Course List", "custom-theme"),
  category: "thrive",
  icon: "welcome-learn-more",
  description: __(
    "Display a list of available courses with filtering and sorting options",
    "custom-theme",
  ),
  attributes: {},
  edit: (props) => {
    const { attributes, setAttributes } = props as {
      attributes: Attrs;
      setAttributes: (a: Partial<Attrs>) => void;
    };
    const blockProps = useBlockProps({ className: "course-list-block-editor" });

    return (
      <div {...blockProps}>
        <InspectorControls>
          <PanelBody title={__("Display Settings", "custom-theme")} initialOpen>
            <RangeControl
              label={__("Columns", "custom-theme")}
              value={attributes.columns ?? 3}
              onChange={(columns) => setAttributes({ columns })}
              min={1}
              max={4}
            />
            <RadioControl
              label={__("Card Layout", "custom-theme")}
              selected={attributes.cardLayout || "image-top"}
              options={[
                { label: "Image Top", value: "image-top" },
                { label: "Image Side", value: "image-side" },
              ]}
              onChange={(cardLayout) =>
                setAttributes({
                  cardLayout: cardLayout as "image-top" | "image-side",
                })
              }
            />
            <ToggleControl
              label={__("Show Description", "custom-theme")}
              checked={attributes.showDescription ?? true}
              onChange={(showDescription) => setAttributes({ showDescription })}
            />
            <ToggleControl
              label={__("Show Level Badges", "custom-theme")}
              checked={attributes.showLevelBadges ?? true}
              onChange={(showLevelBadges) => setAttributes({ showLevelBadges })}
            />
            <ToggleControl
              label={__("Show Price", "custom-theme")}
              checked={attributes.showPrice ?? true}
              onChange={(showPrice) => setAttributes({ showPrice })}
            />
            <ToggleControl
              label={__("Show Enrollment Count", "custom-theme")}
              checked={attributes.showEnrollmentCount ?? false}
              onChange={(showEnrollmentCount) =>
                setAttributes({ showEnrollmentCount })
              }
            />
            <ToggleControl
              label={__("Show Cohort Info", "custom-theme")}
              checked={attributes.showCohortInfo ?? true}
              onChange={(showCohortInfo) => setAttributes({ showCohortInfo })}
            />
          </PanelBody>

          <PanelBody title={__("Filtering & Sorting", "custom-theme")}>
            <ToggleControl
              label={__("Show Filter Controls", "custom-theme")}
              checked={attributes.showFilters ?? true}
              onChange={(showFilters) => setAttributes({ showFilters })}
            />
            <SelectControl
              label={__("Sort By", "custom-theme")}
              value={attributes.sortBy || "startDate"}
              options={[
                { label: "Start Date", value: "startDate" },
                { label: "Title", value: "title" },
                { label: "Price", value: "price" },
              ]}
              onChange={(sortBy) =>
                setAttributes({
                  sortBy,
                })
              }
            />
            <RadioControl
              label={__("Sort Order", "custom-theme")}
              selected={attributes.sortOrder || "asc"}
              options={[
                { label: "Ascending", value: "asc" },
                { label: "Descending", value: "desc" },
              ]}
              onChange={(sortOrder) =>
                setAttributes({ sortOrder: sortOrder as "asc" | "desc" })
              }
            />
          </PanelBody>

          <PanelBody title={__("Pagination", "custom-theme")}>
            <SelectControl
              label={__("Items Per Page", "custom-theme")}
              value={String(attributes.pageSize || 12)}
              options={[
                { label: "6", value: "6" },
                { label: "9", value: "9" },
                { label: "12", value: "12" },
                { label: "18", value: "18" },
                { label: "24", value: "24" },
              ]}
              onChange={(pageSize) =>
                setAttributes({ pageSize: parseInt(pageSize, 10) })
              }
            />
            <ToggleControl
              label={__("Show Pagination", "custom-theme")}
              checked={attributes.showPagination ?? true}
              onChange={(showPagination) => setAttributes({ showPagination })}
            />
          </PanelBody>

          <PanelBody title={__("Appearance", "custom-theme")}>
            <TextControl
              label={__("Image Placeholder URL", "custom-theme")}
              value={attributes.imagePlaceholder || ""}
              onChange={(imagePlaceholder) =>
                setAttributes({ imagePlaceholder })
              }
              help={__(
                "Fallback image URL if course has no hero image",
                "custom-theme",
              )}
            />
          </PanelBody>
        </InspectorControls>

        <div className="course-list-preview">
          <div className="components-placeholder">
            <div className="components-placeholder__label">
              📚 Course List Block
            </div>
            <div className="components-placeholder__instructions">
              <p>
                This block displays a dynamic list of courses. Configure options
                in the sidebar.
              </p>
              <ul style={{ textAlign: "left", marginTop: "1rem" }}>
                <li>Columns: {attributes.columns ?? 3}</li>
                <li>Layout: {attributes.cardLayout || "image-top"}</li>
                <li>Sort: {attributes.sortBy || "startDate"}</li>
                <li>Items per page: {attributes.pageSize || 12}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  },
  save: () => null, // Dynamic block, rendered server-side
});
