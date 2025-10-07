import { registerBlockType } from "@wordpress/blocks";
import Edit from "./edit";

registerBlockType("custom-theme/student-upcoming-sessions", {
  edit: Edit,
});
