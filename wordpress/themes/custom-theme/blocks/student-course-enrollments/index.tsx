import { registerBlockType } from "@wordpress/blocks";
import Edit from "./edit";

registerBlockType("custom-theme/student-course-enrollments", {
  edit: Edit,
});
