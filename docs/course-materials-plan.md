# Course Materials Plan

## Overview
This document outlines the plan for the Course Materials feature, which allows admins to create and manage course content (modules, lessons) and students to view and interact with it.

## Admin Builder Interface

### Location
The admin builder is located at `/wp-admin/admin.php?page=thrive-course-materials`.

### Dependencies & Constraints
- **Course Program Required:** The builder interface requires at least one "Course Program" to be present in the system to function.
- **Empty State Behavior:** If no course programs exist, the "Select Course" dropdown will be empty. Currently, there is no explicit "empty state" message guiding the user to create a program first; the interface simply remains inactive.
- **Selection Flow:** Users must select a **Course Program** and then a **Course Level** before they can add modules or lessons.

### Workflow
1.  **Select Course:** Choose a Course Program from the dropdown.
2.  **Select Level:** Choose a Course Level (e.g., "Level 1") associated with the program.
3.  **Add Content:** Once a level is selected, buttons to "Add Module" and "Add Lesson" become available.

## Data Model
- **Course Program:** The top-level container (e.g., "Thrive in Spanish").
- **Course Level:** A specific level within a program (e.g., "Level 1", "Level 2").
- **Module:** A grouping of lessons (e.g., "Module 1: Introductions").
- **Lesson:** The actual content unit (video, text, quiz).

## Future Improvements
- Add a clear empty state message when no course programs exist.
- Add a direct link to create a new Course Program from the builder if none exist.
