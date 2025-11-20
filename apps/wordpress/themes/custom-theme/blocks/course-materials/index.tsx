import { registerBlockType } from "@wordpress/blocks";
import { useBlockProps } from "@wordpress/block-editor";
import "./style.css";

registerBlockType("thrive/student-course-materials", {
  edit: ({ attributes, setAttributes }) => {
    const blockProps = useBlockProps();
    return (
      <div {...blockProps}>
        <div className="thrive-admin-placeholder">
          <h3>Student Course Materials</h3>
          <p>
            This block will display the course materials for the current step on
            the frontend.
          </p>
          <p>
            Course Step ID:{" "}
            <input
              type="number"
              value={attributes.courseStepId}
              onChange={(e) =>
                setAttributes({ courseStepId: parseInt(e.target.value) })
              }
            />
          </p>
        </div>
      </div>
    );
  },
});
