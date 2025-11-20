# Student Course Materials Block

## Overview
The **Student Course Materials** block (`thrive/student-course-materials`) is responsible for rendering the self-study curriculum for a specific course step. It is designed to be used on the course content pages where students consume learning materials.

## Technical Implementation

### Block Registration
- **Name:** `thrive/student-course-materials`
- **Location:** `apps/wordpress/themes/custom-theme/blocks/course-materials/`
- **Attributes:**
  - `courseStepId`: The ID of the course step to display materials for.
  - `studentPackageId`: The ID of the student's enrollment package (context).

### Rendering Strategy
The block uses a hybrid rendering approach:
1. **Server-Side (`render.php`):**
   - Performs authentication checks using `thrive_is_logged_in()`.
   - Validates the user has access to the content.
   - Renders a placeholder container with data attributes (`data-course-step-id`, `data-student-package-id`).
   - Displays a "Login Required" message if the user is not authenticated.

2. **Client-Side (`view.tsx`):**
   - Hydrates the React component `StudentCourseMaterials` into the container.
   - Fetches the actual material content from the NestJS API.
   - Handles user interactions (viewing materials, answering questions).

### Components
- **`StudentCourseMaterials.tsx`:** The main container component.
- **`MaterialDisplay.tsx`:** Renders specific material types (Video, Rich Text, File).
- **`QuestionDisplay.tsx`:** Renders question forms (Multiple Choice, Text, File Upload).

### API Integration
The block communicates with the NestJS backend to:
- Fetch course materials for the given step.
- Submit student answers.
- Track progress.

### Usage
This block is intended to be placed in the template for the Course Step custom post type or a dedicated learning page. It requires the `courseStepId` to be passed via block attributes or context.
