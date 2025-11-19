# Course & Session Materials - Implementation Plan (v2)

This document outlines the plan for implementing a new feature to manage and present educational materials for both courses and individual sessions, including a structured self-study component with progress tracking and assessments.

## 1. Goals & Scope

The primary goal is to provide a comprehensive learning experience through course- and session-specific materials.

The feature includes two main components:
-   **Session Materials:** Simple material attachments (files, videos) for individual class sessions.
-   **Course Self-Study Component:** A structured, linear curriculum of materials and tasks for each course. This includes:
    -   A defined sequence of learning steps.
    -   Tracking of student progress through the materials.
    -   In-app questions for students to answer.
    -   Automated assessment for discrete answers (e.g., multiple choice).
    -   A manual assessment workflow for teachers to review and provide feedback on long-form text, voice, or video submissions.

## 2. Feature Requirements

Based on feedback, the following requirements have been established:

-   **Permissions:** Only users with the **Admin** role can create, edit, or manage any course or session materials.
-   **Self-Study Structure:** The self-study component will be a **linear progression** of steps, not a simple library.
-   **Progress Tracking:** The system **must** track each student's progress through the self-study curriculum (e.g., not started, in progress, completed).
-   **Material Types:** Materials will be embedded directly in the UI. This includes:
    -   File Uploads (PDFs, documents, images)
    -   Video Embeds (e.g., YouTube, Vimeo)
    -   Rich Text Content
    -   *No external resources or links.*
-   **User Experience:**
    -   Each course will have its own dedicated **Self-Study section**.
    -   A general **Materials page/section** will be added to the student and teacher dashboards to provide easy access.

## 3. Detailed Implementation Plan

### 3.1. Data Model (NestJS / MariaDB)

Several new tables are required to support the curriculum structure, progress tracking, and assessment features.

**1. `course_material`**
Stores the core content for each step in the curriculum.
```sql
CREATE TABLE `course_material` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `type` ENUM('file', 'video_embed', 'rich_text', 'question') NOT NULL,
  `content` TEXT, -- URL for file, embed code for video, markdown for rich text. NULL if type is 'question'.
  `course_id` INT NULL, -- Link to a course for self-study material
  `session_id` INT NULL, -- Link to a session for session-specific material
  `"order"` INT NOT NULL DEFAULT 0, -- For ordering materials within a course curriculum
  `created_by_id` INT NOT NULL, -- Foreign key to `user` table (admin)
  -- ... timestamps
  PRIMARY KEY (`id`),
  FOREIGN KEY (`course_id`) REFERENCES `course`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by_id`) REFERENCES `user`(`id`)
);
```

**2. `material_question`**
Stores question data, linked to a material of type 'question'.
```sql
CREATE TABLE `material_question` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `material_id` INT NOT NULL,
  `question_text` TEXT NOT NULL,
  `question_type` ENUM('multiple_choice', 'long_text', 'file_upload', 'video_upload') NOT NULL,
  `options` JSON, -- For multiple_choice answers
  PRIMARY KEY (`id`),
  FOREIGN KEY (`material_id`) REFERENCES `course_material`(`id`) ON DELETE CASCADE
);
```

**3. `student_material_progress`**
Tracks a student's completion status for a specific material.
```sql
CREATE TABLE `student_material_progress` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `student_id` INT NOT NULL,
  `material_id` INT NOT NULL,
  `status` ENUM('not_started', 'in_progress', 'completed') NOT NULL DEFAULT 'not_started',
  -- ... timestamps
  PRIMARY KEY (`id`),
  FOREIGN KEY (`student_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`material_id`) REFERENCES `course_material`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `student_material_unique` (`student_id`, `material_id`)
);
```

**4. `student_answer`**
Stores a student's submission for a question.
```sql
CREATE TABLE `student_answer` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `question_id` INT NOT NULL,
  `student_id` INT NOT NULL,
  `answer_content` TEXT NOT NULL, -- The student's answer (text, or URL to uploaded file/video)
  `status` ENUM('pending_assessment', 'approved', 'needs_revision') NOT NULL DEFAULT 'pending_assessment',
  `assessed_by_id` INT NULL, -- Foreign key to `user` table (teacher)
  `feedback` TEXT,
  -- ... timestamps
  PRIMARY KEY (`id`),
  FOREIGN KEY (`question_id`) REFERENCES `material_question`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`student_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`assessed_by_id`) REFERENCES `user`(`id`)
);
```

### 3.2. API Endpoints (NestJS)

The API will be expanded significantly under `/materials` and new routes.

**Admin Endpoints (Admin role required):**
-   `POST /admin/courses/:courseId/materials`: Create a new material for a course.
-   `PUT /admin/materials/:id`: Update a material's content or order.
-   `DELETE /admin/materials/:id`: Delete a material.
-   `POST /admin/materials/:id/question`: Add/update the question for a material.

**Student Endpoints (Enrolled student role required):**
-   `GET /courses/:courseId/curriculum`: Get the full curriculum structure for a course, including the student's progress.
-   `POST /materials/progress`: Mark a material as started or completed.
-   `POST /questions/:questionId/answers`: Submit an answer to a question.
-   `GET /my/answers`: Get all of a student's answers and their assessment status.

**Teacher Endpoints (Teacher role required):**
-   `GET /assessment/queue`: Get a list of student answers awaiting assessment.
-   `POST /assessment/answers/:answerId`: Submit feedback and a status (approved/needs_revision) for an answer.

### 3.3. File Handling (WordPress)

The strategy remains the same, but will now also apply to student-uploaded submissions for `file_upload` or `video_upload` question types. The same authenticated URL mechanism can be used for both admin and student uploads to the WP Media Library.

### 3.4. Frontend Components (WordPress / React)

-   **Admin Curriculum Builder:** A new, dedicated interface in the WP admin area for Admins to create, organize, and re-order the self-study curriculum for each course. This will be a rich, interactive UI (e.g., drag-and-drop list).
-   **Student Self-Study View:** A new block/page for each course that presents the linear curriculum. It will show the student's progress, display one material at a time, and provide the interface for answering questions and submitting them.
-   **Teacher Assessment Dashboard:** A new page in the WP admin area where teachers can view a queue of student submissions, review the content (text or uploaded files), and submit feedback.
-   **Dashboard Integration:**
    -   **Student Dashboard:** Will feature a new "My Courses" section linking to the self-study page for each enrolled course.
    -   **Teacher Dashboard:** Will feature a prominent link to the "Assessment Queue".

## 4. Phased Rollout

1.  **Phase 1: Backend & Admin UI.**
    -   Implement all required database tables and NestJS entities.
    -   Build the core API endpoints for Admin management of materials.
    -   Create the **Admin Curriculum Builder** UI for creating and ordering materials (read-only for now on the student side).
2.  **Phase 2: Student Read-Only View & Progress.**
    -   Build the **Student Self-Study View** to display the linear curriculum in a read-only format.
    -   Implement the student progress tracking API and frontend logic to mark materials as "completed".
3.  **Phase 3: Q&A and Automated Assessment.**
    -   Add question/answer forms to the Student Self-Study View.
    -   Implement API endpoints for answer submission.
    -   Implement logic for auto-assessed questions (e.g., multiple choice).
4.  **Phase 4: Manual Assessment Workflow.**
    -   Implement submission for long-form answers (text, file uploads).
    -   Build the **Teacher Assessment Dashboard** for reviewing and providing feedback.
    -   Display teacher feedback to the student.
5.  **Phase 5: Dashboard Integration.**
    -   Add the new sections and links to the main Student and Teacher dashboards.
