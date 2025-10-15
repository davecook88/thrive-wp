import { registerBlockType } from "@wordpress/blocks";
import { __ } from "@wordpress/i18n";
import { useBlockProps } from "@wordpress/block-editor";

type BookingPolicyNoticeAttributes = {};

registerBlockType<BookingPolicyNoticeAttributes>(
  "custom-theme/booking-policy-notice",
  {
    title: __("Booking Policy Notice", "custom-theme"),
    category: "widgets",
    description: __(
      "Displays current booking cancellation and rescheduling policies to students",
      "custom-theme"
    ),
    attributes: {},
    edit: () => {
      const blockProps = useBlockProps();

      return (
        <div {...blockProps}>
          <div className="wp-block-custom-theme-booking-policy-notice">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-blue-800 mb-2">
                📋 Booking Policy
              </h4>
              <p className="text-blue-700 text-sm">
                This block will display the current booking cancellation and
                rescheduling policies to students.
              </p>
              <div className="mt-3 space-y-1 text-sm text-blue-600">
                <div>✅ Cancellation rules</div>
                <div>🔄 Rescheduling limits</div>
                <div>💳 Refund policies</div>
              </div>
            </div>
          </div>
        </div>
      );
    },
    save: () => null, // Dynamic block
  }
);
