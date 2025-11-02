import { registerBlockType } from "@wordpress/blocks";
import { InnerBlocks, useBlockProps } from "@wordpress/block-editor";
import { __ } from "@wordpress/i18n";

registerBlockType("custom-theme/course-details", {
  title: __("Course Details", "custom-theme"),
  category: "thrive",
  icon: "text-page",
  description: __(
    "Static content area for additional course information",
    "custom-theme",
  ),
  attributes: {},
  edit: () => {
    const blockProps = useBlockProps({
      className: "course-details-block-editor",
    });

    return (
      <div {...blockProps}>
        <div className="course-details-editor-header">
          <h3>{__("Course Details", "custom-theme")}</h3>
          <p>
            {__(
              "Add any additional content about this course - FAQs, testimonials, curriculum details, etc.",
              "custom-theme",
            )}
          </p>
        </div>
        <InnerBlocks
          allowedBlocks={[
            "core/paragraph",
            "core/heading",
            "core/list",
            "core/image",
            "core/quote",
            "core/separator",
            "core/spacer",
            "core/columns",
            "core/group",
          ]}
          template={[
            [
              "core/heading",
              {
                level: 2,
                placeholder: __("What You'll Learn", "custom-theme"),
              },
            ],
            [
              "core/paragraph",
              {
                placeholder: __(
                  "Describe what students will learn in this course...",
                  "custom-theme",
                ),
              },
            ],
          ]}
        />
      </div>
    );
  },
  save: () => {
    const blockProps = useBlockProps.save();
    return (
      <div {...blockProps}>
        <InnerBlocks.Content />
      </div>
    );
  },
});
