import { registerBlockType } from "@wordpress/blocks";
import Edit from "./edit";

registerBlockType("custom-theme/teacher-calendar", {
  title: "Teacher Calendar",
  description: "Display teacher calendar with classes and availability modes",
  category: "widgets",
  icon: "calendar-alt",
  supports: {
    html: false,
  },
  attributes: {
    view: {
      type: "string",
      default: "week",
    },
    slotDuration: {
      type: "number",
      default: 30,
    },
    snapTo: {
      type: "number",
      default: 15,
    },
    viewHeight: {
      type: "number",
      default: 600,
    },
  },
  edit: Edit,
  save: () => null, // Dynamic block rendered with PHP
});
