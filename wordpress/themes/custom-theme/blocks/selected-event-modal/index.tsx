import { registerBlockType } from "@wordpress/blocks";
import { __ } from "@wordpress/i18n";
import { PanelBody, SelectControl } from "@wordpress/components";
import { InspectorControls, useBlockProps } from "@wordpress/block-editor";
import { useEffect, useState } from "@wordpress/element";

type Attrs = {
  availabilityModalId?: number;
  classModalId?: number;
  courseModalId?: number;
  defaultModalId?: number;
};

type ModalOption = { label: string; value: string };

registerBlockType<Attrs>("custom-theme/selected-event-modal", {
  title: __("Selected Event Modal", "custom-theme"),
  category: "widgets",
  icon: "welcome-widgets-menus",
  attributes: {},
  edit: ({ attributes, setAttributes }) => {
    const [options, setOptions] = useState<ModalOption[]>([]);
    const blockProps = useBlockProps();

    useEffect(() => {
      // Fetch modal CPTs from REST
      (async () => {
        try {
          const res = await fetch(
            "/wp-json/wp/v2/thrive_modal?per_page=100&_fields=id,title"
          );
          if (!res.ok) return;
          const data = await res.json();
          setOptions(
            data.map((p: any) => ({
              label: p.title?.rendered || `#${p.id}`,
              value: String(p.id),
            }))
          );
        } catch {}
      })();
    }, []);

    return (
      <div {...blockProps}>
        <InspectorControls>
          <PanelBody title={__("Modal Templates", "custom-theme")} initialOpen>
            <SelectControl
              label={__("AVAILABILITY events → Modal", "custom-theme")}
              value={String(attributes.availabilityModalId || "")}
              options={[{ label: "— Select —", value: "" }, ...options]}
              onChange={(v) =>
                setAttributes({ availabilityModalId: v ? Number(v) : 0 })
              }
            />
            <SelectControl
              label={__("CLASS events → Modal", "custom-theme")}
              value={String(attributes.classModalId || "")}
              options={[{ label: "— Select —", value: "" }, ...options]}
              onChange={(v) =>
                setAttributes({ classModalId: v ? Number(v) : 0 })
              }
            />
            <SelectControl
              label={__("COURSE events → Modal", "custom-theme")}
              value={String(attributes.courseModalId || "")}
              options={[{ label: "— Select —", value: "" }, ...options]}
              onChange={(v) =>
                setAttributes({ courseModalId: v ? Number(v) : 0 })
              }
            />
            <SelectControl
              label={__("Default Modal", "custom-theme")}
              value={String(attributes.defaultModalId || "")}
              options={[{ label: "— Select —", value: "" }, ...options]}
              onChange={(v) =>
                setAttributes({ defaultModalId: v ? Number(v) : 0 })
              }
            />
          </PanelBody>
        </InspectorControls>
        <p style={{ fontSize: 12, color: "#555" }}>
          {__(
            "This block opens a modal when an event is selected in the calendar. Choose which modal templates to use for each event type.",
            "custom-theme"
          )}
        </p>
      </div>
    );
  },
  save: () => null,
});
