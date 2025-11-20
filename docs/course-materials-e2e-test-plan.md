# Course Materials E2E Test Plan

This document outlines the end-to-end (E2E) test scenarios required to validate the Course Materials feature using Playwright. The tests cover the entire lifecycle from an Admin creating materials to a Student consuming them and submitting answers.

## Prerequisites & Test Data Setup

Before running these flows, the test environment must be seeded with:
1.  **Users:**
    *   `adminUser`: Role `administrator`.
    *   `studentUser`: Role `subscriber` (or `student`).
    *   `teacherUser`: Role `editor` (or `teacher`).
2.  **Course Structure:**
    *   A **Course Program** (e.g., "E2E Test Course").
    *   A **Course Step** (e.g., "Step 1: Introduction").
    *   A **Student Package** enrolling `studentUser` into "E2E Test Course".

---

## Flow 1: Admin - Create Course Materials

**Actor:** `adminUser`
**Goal:** Populate a Course Step with various types of learning materials.

### Steps:
1.  **Login** to WordPress Admin.
2.  **Navigate** to the "Course Materials" management page (or the specific Course Step edit screen where the builder is hosted).
3.  **Select Context:** Choose "E2E Test Course" and "Step 1: Introduction".
4.  **Add "Rich Text" Material:**
    *   Click "Add Material".
    *   Select Type: `Rich Text`.
    *   Enter Title: "Welcome to the Course".
    *   Enter Content: "This is the introduction text."
    *   Save.
    *   *Verify:* Material appears in the list.
5.  **Add "Video" Material:**
    *   Click "Add Material".
    *   Select Type: `Video Embed`.
    *   Enter Title: "Intro Video".
    *   Enter Content: `<iframe src="..."></iframe>` (Mock embed code).
    *   Save.
    *   *Verify:* Material appears in the list.
6.  **Add "Multiple Choice Question" Material:**
    *   Click "Add Material".
    *   Select Type: `Question`.
    *   Enter Title: "Knowledge Check 1".
    *   Select Question Type: `Multiple Choice`.
    *   Enter Question Text: "What is 2 + 2?".
    *   Add Option A: "3" (Incorrect).
    *   Add Option B: "4" (Correct).
    *   Save.
    *   *Verify:* Material appears in the list.
7.  **Add "Long Text Question" Material:**
    *   Click "Add Material".
    *   Select Type: `Question`.
    *   Enter Title: "Essay Assignment".
    *   Select Question Type: `Long Text`.
    *   Enter Question Text: "Describe your goals.".
    *   Save.
    *   *Verify:* Material appears in the list.
8.  **Reorder Materials (Optional):**
    *   Drag "Intro Video" above "Welcome to the Course".
    *   Save Order.

---

## Flow 2: Student - Self-Study & Progress Tracking

**Actor:** `studentUser`
**Goal:** Consume content, track progress, and submit auto-graded answers.

### Steps:
1.  **Login** to the Frontend.
2.  **Navigate** to the "Step 1: Introduction" page (where the `thrive/student-course-materials` block is rendered).
3.  **Verify Initial State:**
    *   "Welcome to the Course" (or first item) is displayed.
    *   Progress indicator shows "0 of 4 completed".
    *   Status icon for Item 1 is "In Progress" (or "Not Started").
4.  **Consume Rich Text:**
    *   Read the text.
    *   Click "Mark as Complete".
    *   *Verify:* Status icon changes to "Completed".
    *   *Verify:* Automatically advances to next material ("Intro Video").
5.  **Consume Video:**
    *   Verify video container is present.
    *   Click "Mark as Complete".
    *   *Verify:* Status icon changes to "Completed".
    *   *Verify:* Advances to "Knowledge Check 1".
6.  **Submit Multiple Choice (Correct):**
    *   Select "4".
    *   Click "Submit Answer".
    *   *Verify:* UI shows "Answer Submitted!" / "Correct".
    *   *Verify:* Progress marks as "Completed".
    *   *Verify:* Advances to "Essay Assignment".
7.  **Submit Multiple Choice (Incorrect - Optional Branch):**
    *   (If re-running) Select "3".
    *   Click "Submit Answer".
    *   *Verify:* UI shows "Incorrect, please try again" (if retry allowed) or "Needs Revision".

---

## Flow 3: Student - Submit Manual Assessment

**Actor:** `studentUser`
**Goal:** Submit an answer that requires teacher review.

### Steps:
1.  **Navigate** to "Essay Assignment" (Material 4).
2.  **Input Answer:**
    *   Type "My goal is to learn E2E testing." into the text area.
3.  **Submit:**
    *   Click "Submit Answer".
4.  **Verify State:**
    *   UI shows "Answer Submitted for Review".
    *   Progress status might show "Pending" or "Completed" (depending on business logic - usually "Completed" for the *action* of submitting, but status is `pending_assessment`).

---

## Flow 4: Teacher - Assess Submissions

**Actor:** `teacherUser`
**Goal:** Review and grade the student's manual submission.

### Steps:
1.  **Login** to WordPress Admin (or Teacher Dashboard).
2.  **Navigate** to "Assessment Queue".
3.  **Locate Submission:** Find the "Essay Assignment" submission from `studentUser`.
4.  **Review:**
    *   Read "My goal is to learn E2E testing.".
5.  **Grade:**
    *   Select Status: `Approved`.
    *   Enter Feedback: "Great goal!".
    *   Click "Submit Assessment".
6.  **Verify:** Submission is removed from the queue.

---

## Flow 5: Student - View Feedback

**Actor:** `studentUser`
**Goal:** See the teacher's feedback.

### Steps:
1.  **Navigate** back to "Step 1: Introduction".
2.  **Go to** "Essay Assignment".
3.  **Verify:**
    *   Status shows "Approved".
    *   Feedback "Great goal!" is visible.

---

## Technical Implementation Notes for Playwright

*   **Selectors:** Use `data-testid` attributes in the React components (`StudentCourseMaterials.tsx`, `QuestionForm.tsx`) to make selectors robust.
    *   e.g., `data-testid="material-title"`, `data-testid="btn-mark-complete"`, `data-testid="option-radio"`.
*   **Mocking:**
    *   For **Flow 1 (Admin)**, since the Admin UI is not fully built yet, we might need to seed the database directly via API calls (`POST /api/course-materials`) to set up the test state for Flow 2.
    *   Once the Admin UI is built, Flow 1 should be automated via UI.
*   **Authentication:** Use the existing `auth.setup.ts` or helper functions to bypass login screens and inject session cookies/headers.
