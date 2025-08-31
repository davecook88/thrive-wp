import { registerBlockType, serialize } from "@wordpress/blocks";
import { __ } from "@wordpress/i18n";
import { PanelBody, TextControl, Button, Modal } from "@wordpress/components";
import {
  InspectorControls,
  useBlockProps,
  InnerBlocks,
} from "@wordpress/block-editor";
import { useSelect } from "@wordpress/data";
import { useState } from "@wordpress/element";

type Attrs = {
  modalId?: string;
  label?: string;
};

registerBlockType<Attrs>("custom-theme/thrive-calendar-modal", {
  title: __("Thrive Calendar Modal", "custom-theme"),
  category: "widgets",
  icon: "feedback",
  attributes: {},
  edit: (props) => {
    const { attributes, setAttributes, clientId } = props as any as {
      attributes: Attrs;
      setAttributes: (a: Partial<Attrs>) => void;
      clientId: string;
    };
    const blockProps = useBlockProps({ className: "thrive-calendar-modal" });
    const [previewOpen, setPreviewOpen] = useState(false);
    const innerBlocks = useSelect(
      (select: any) => select("core/block-editor").getBlocks(clientId),
      [clientId]
    );

    return (
      <div {...blockProps}>
        <InspectorControls>
          <PanelBody title={__("Modal Settings", "custom-theme")} initialOpen>
            <TextControl
              label={__(
                "Modal ID (used to reference from calendar)",
                "custom-theme"
              )}
              value={attributes.modalId || ""}
              onChange={(modalId) => setAttributes({ modalId })}
            />
            <TextControl
              label={__("Label (for editor only)", "custom-theme")}
              value={attributes.label || ""}
              onChange={(label) => setAttributes({ label })}
            />
          </PanelBody>
        </InspectorControls>

        <div
          style={{
            marginBottom: 8,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <strong>
            {attributes.label ||
              attributes.modalId ||
              __("Untitled Modal", "custom-theme")}
          </strong>
          <Button
            variant="secondary"
            onClick={() => setPreviewOpen(true)}
            aria-label={__("Preview modal", "custom-theme")}
          >
            {__("Preview", "custom-theme")}
          </Button>
        </div>
        <InnerBlocks
          allowedBlocks={[
            "core/heading",
            "core/paragraph",
            "core/buttons",
            "core/image",
            "core/list",
          ]}
          templateLock={false}
        />
        {previewOpen && (
          <Modal
            title={attributes.label || __("Modal Preview", "custom-theme")}
            onRequestClose={() => setPreviewOpen(false)}
          >
            <div dangerouslySetInnerHTML={{ __html: serialize(innerBlocks) }} />
          </Modal>
        )}
      </div>
    );
  },
  save: () => null,
});
