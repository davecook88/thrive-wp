import { registerBlockType } from "@wordpress/blocks";
import Edit from "./edit";

registerBlockType("custom-theme/student-package-details", {
  edit: Edit,
});
