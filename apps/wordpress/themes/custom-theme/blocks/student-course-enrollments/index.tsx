import { registerBlockType } from "@wordpress/blocks";
import Edit from "./edit";
import "./style.css";

registerBlockType("custom-theme/student-course-enrollments", {
  edit: Edit,
});
