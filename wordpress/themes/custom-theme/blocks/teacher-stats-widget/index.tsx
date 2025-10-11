import { registerBlockType } from "@wordpress/blocks";
import Edit from "./edit";

registerBlockType("custom-theme/teacher-stats-widget", {
  title: "Teacher Stats Widget",
  description: "Display teacher statistics including sessions taught and upcoming sessions",
  category: "widgets",
  icon: "chart-bar",
  supports: {
    html: false,
  },
  attributes: {
    showNextSession: {
      type: "boolean",
      default: true,
    },
    showCompletedSessions: {
      type: "boolean",
      default: true,
    },
    showScheduledSessions: {
      type: "boolean",
      default: true,
    },
    showActiveStudents: {
      type: "boolean",
      default: true,
    },
  },
  edit: Edit,
  save: () => null, // Dynamic block rendered with PHP
});
