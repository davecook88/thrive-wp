import { registerBlockType } from "@wordpress/blocks";
import {
  useBlockProps,
  InnerBlocks,
  InspectorControls,
} from "@wordpress/block-editor";
import { PanelBody, TextControl } from "@wordpress/components";
import { __ } from "@wordpress/i18n";

type Attrs = {
  bookingStart?: string;
  bookingEnd?: string;
  teacherId?: string;
  orderId?: string;
  selectedPackageId?: string;
  selectedPriceId?: string;
  selectedPackageName?: string;
};

registerBlockType<Attrs>("custom-theme/checkout-context", {
  title: __("Checkout Context", "custom-theme"),
  icon: "cart",
  category: "widgets",
  attributes: {
    bookingStart: { type: "string" },
    bookingEnd: { type: "string" },
    teacherId: { type: "string" },
    orderId: { type: "string" },
    selectedPackageId: { type: "string" },
    selectedPriceId: { type: "string" },
    selectedPackageName: { type: "string" },
  },
  edit: ({ attributes, setAttributes }) => {
    const blockProps = useBlockProps();
    const {
      bookingStart,
      bookingEnd,
      teacherId,
      orderId,
      selectedPackageId,
      selectedPriceId,
      selectedPackageName,
    } = attributes;

    return (
      <div {...blockProps}>
        <InspectorControls>
          <PanelBody title={__("Checkout Context", "custom-theme")} initialOpen>
            <TextControl
              label={__("Booking Start (ISO)", "custom-theme")}
              value={bookingStart || ""}
              onChange={(v) => setAttributes({ bookingStart: v })}
            />
            <TextControl
              label={__("Booking End (ISO)", "custom-theme")}
              value={bookingEnd || ""}
              onChange={(v) => setAttributes({ bookingEnd: v })}
            />
            <TextControl
              label={__("Teacher ID", "custom-theme")}
              value={teacherId || ""}
              onChange={(v) => setAttributes({ teacherId: v })}
            />
            <TextControl
              label={__("Order ID (optional)", "custom-theme")}
              value={orderId || ""}
              onChange={(v) => setAttributes({ orderId: v })}
            />
            <TextControl
              label={__("Selected Package ID (initial)", "custom-theme")}
              value={selectedPackageId || ""}
              onChange={(v) => setAttributes({ selectedPackageId: v })}
            />
            <TextControl
              label={__("Selected Price ID (initial)", "custom-theme")}
              value={selectedPriceId || ""}
              onChange={(v) => setAttributes({ selectedPriceId: v })}
            />
            <TextControl
              label={__("Selected Package Name (initial)", "custom-theme")}
              value={selectedPackageName || ""}
              onChange={(v) => setAttributes({ selectedPackageName: v })}
            />
          </PanelBody>
        </InspectorControls>

        <div style={{ border: "1px dashed #d1d5db", padding: "12px" }}>
          <strong>{__("Checkout Context Provider", "custom-theme")}</strong>
          <div style={{ marginTop: 8 }}>
            <InnerBlocks />
          </div>
        </div>
      </div>
    );
  },
  save: () => {
    const wrapperProps = useBlockProps.save({
      className: "wp-block-custom-theme-checkout-context",
    } as any);
    return (
      <div {...wrapperProps}>
        <InnerBlocks.Content />
      </div>
    );
  },
});
