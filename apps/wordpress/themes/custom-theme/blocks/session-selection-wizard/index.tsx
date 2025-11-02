import { registerBlockType } from "@wordpress/blocks";
import metadata from "./block.json";

registerBlockType(metadata.name, {
  edit: () => {
    return (
      <div className="session-selection-wizard-block">
        <div className="block-placeholder">
          <h3>Session Selection Wizard</h3>
          <p>
            This block displays the session selection wizard after course
            enrollment.
          </p>
          <p>
            <em>Preview available only on the frontend with a valid session_id parameter.</em>
          </p>
        </div>
      </div>
    );
  },
});
