import { registerBlockType } from "@wordpress/blocks";
import { useBlockProps } from "@wordpress/block-editor";
import { createElement } from "@wordpress/element";

registerBlockType("custom-theme/teacher-profile-form", {
  title: "Teacher Profile Form",
  category: "thrive",
  attributes: {},
  edit: () => {
    const blockProps = useBlockProps();

    return createElement(
      "div",
      blockProps,
      createElement(
        "div",
        {
          style: {
            padding: "20px",
            border: "1px solid #ccc",
            borderRadius: "4px",
            backgroundColor: "#f9f9f9",
          },
        },
        createElement("h3", null, "Teacher Profile Form"),
        createElement(
          "p",
          null,
          "This block will display a form for teachers to edit their profile information."
        )
      )
    );
  },
  save: () => null, // Server-side rendered
});
