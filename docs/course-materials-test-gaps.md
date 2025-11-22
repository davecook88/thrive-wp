# Course Materials - Test Coverage Gaps

## Overview

The course materials feature is designed to support a complete end-to-end workflow for admins creating course content, students learning and submitting answers, teachers grading submissions, and students receiving feedback. Current test coverage is minimal, with only basic page load tests and no interaction testing.

**Current Status:** 2 tests covering ~5% of functionality
**Coverage Gap:** 31+ untested user flows across 5 major workflows

---

## Current Test Coverage

### What IS Tested ✅
1. Course step page loads at correct URL
2. Student course materials block container exists on page

### What IS NOT Tested ❌
Everything else (see detailed list below)

---

## Untested Flows by Workflow

### Flow 1: Admin - Create Course Materials

Location: `/wp-admin/admin.php?page=thrive-course-materials`

#### Prerequisites
- [ ] **No Empty State Test** - Verify error/empty state when no course programs exist
- [ ] **Create Test Course Program** - Seed a test course program (may require separate test data setup)

#### Selection & Navigation
- [ ] **Select Course Program** - Admin can select a course program from dropdown
- [ ] **Course Program Dropdown Populated** - Dropdown shows available course programs
- [ ] **Select Course Level** - Admin can select a course level after program selection
- [ ] **Course Level Dropdown Populated** - Dropdown shows available levels for selected program
- [ ] **Add Material Buttons Enabled** - "Add Material" buttons become enabled after level selection
- [ ] **Breadcrumb/Navigation Updates** - UI updates to show selected program and level

#### Adding Materials
- [ ] **Add Rich Text Material** - Admin can create rich text content material
- [ ] **Rich Text Content Saved** - Rich text content persists after save
- [ ] **Add Video Embed Material** - Admin can add video embed material (iframe URL)
- [ ] **Video Embed Saved** - Video embed content persists after save
- [ ] **Add Multiple Choice Question** - Admin can create multiple choice questions
- [ ] **Multiple Choice Options Saved** - Options and correct answer(s) persist
- [ ] **Add Long Text Question** - Admin can create long text questions (for manual review)
- [ ] **Long Text Questions Saved** - Question content persists after save
- [ ] **Add File Upload Question** (Optional) - Admin can add file upload questions if implemented
- [ ] **File Upload Questions Saved** - File upload questions persist

#### Material Management
- [ ] **Material List Displays** - All added materials appear in list/grid view
- [ ] **Material Order Preserved** - Materials maintain creation order by default
- [ ] **Reorder Materials** - Admin can drag/reorder materials in the list
- [ ] **Reorder Persists** - Material order changes persist after save
- [ ] **Delete Material** - Admin can remove materials from the list
- [ ] **Delete Confirmation** - Confirmation dialog appears before deletion
- [ ] **Edit Material** - Admin can edit existing material content
- [ ] **Edit Persists** - Material edits persist after save
- [ ] **Material Validation** - Required fields show validation errors

#### Admin UI Polish
- [ ] **Save Feedback** - Success message appears after save
- [ ] **Error Handling** - Error messages display for failed operations
- [ ] **Loading States** - UI shows loading indicator during API calls
- [ ] **Unsaved Changes Warning** - Warning appears if user tries to leave with unsaved changes

---

### Flow 2: Student - Self-Study & Progress Tracking

Location: `/course/{courseSlug}/step-{stepNumber}`

#### Material Display
- [ ] **Learning Materials Render** - Materials display on student course step page
- [ ] **Rich Text Content Shows** - Rich text materials display correctly formatted
- [ ] **Video Embeds Load** - Video embed materials load in iframe
- [ ] **Multiple Choice Questions Display** - MCQs show with all options
- [ ] **Long Text Questions Display** - Long text questions show instruction text
- [ ] **Correct Material Order** - Materials display in correct order

#### Progress Tracking
- [ ] **Progress Indicator Shows** - "X of Y completed" or similar indicator displays
- [ ] **Progress Updates** - Progress counter increments as student completes materials
- [ ] **Completion Percentage** - Visual progress bar or percentage indicator shows
- [ ] **Material Status Icons** - Visual indicators show status (Not Started, In Progress, Completed, Needs Revision)

#### Rich Text Interaction
- [ ] **Mark Text Complete Button** - Button appears for rich text materials
- [ ] **Mark Text Complete** - Student can click to mark text as complete
- [ ] **Mark Text Complete Feedback** - "Marked as complete" or checkmark appears
- [ ] **Auto-Advance After Text** - View automatically advances to next material
- [ ] **Status Icon Updates** - Status icon changes to "Completed" with checkmark

#### Video Interaction
- [ ] **Mark Video Complete Button** - Button appears for video materials
- [ ] **Mark Video Complete** - Student can click to mark video as complete
- [ ] **Mark Video Complete Feedback** - Confirmation appears after marking complete
- [ ] **Auto-Advance After Video** - View advances to next material
- [ ] **Video Status Icon Updates** - Status changes to completed

#### Multiple Choice Interaction
- [ ] **Select Option** - Student can select a multiple choice option
- [ ] **Submit Answer Button** - Submit/Check answer button becomes enabled
- [ ] **Submit Correct Answer** - Student submits correct answer
- [ ] **Correct Answer Feedback** - "Correct!" message or success feedback displays
- [ ] **Correct Answer Status** - Material marked as "Completed" with checkmark
- [ ] **Correct Answer Auto-Advance** - View automatically advances to next material
- [ ] **Submit Incorrect Answer** - Student submits incorrect answer
- [ ] **Incorrect Answer Feedback** - "Incorrect, try again" or "Needs Revision" message
- [ ] **Incorrect Answer Status** - Material shows "Needs Revision" or similar warning status
- [ ] **Allow Retry** - Student can retry incorrect answer (or disabled based on requirements)
- [ ] **Show Explanation** (Optional) - Explanation displays for correct/incorrect answers

#### Status and Progress
- [ ] **Status Icons Change** - Visual status indicators update as student progresses through materials
- [ ] **Not Started Icon** - Initial material shows "Not Started" status
- [ ] **In Progress Icon** - Active material shows "In Progress" status
- [ ] **Completed Icon** - Finished material shows "Completed" with checkmark
- [ ] **Needs Revision Icon** - Incorrect answers show "Needs Revision" status
- [ ] **Progress Persists** - Student progress saves and persists on page reload
- [ ] **Correct Answers Locked** - Correct answers cannot be changed after submission

#### Edge Cases
- [ ] **No Materials** - Message displays when course step has no materials
- [ ] **Accessibility** - Materials are keyboard navigable
- [ ] **Mobile Responsiveness** - Materials render correctly on mobile devices

---

### Flow 3: Student - Submit Manual Assessment

Location: `/course/{courseSlug}/step-{stepNumber}` (long text questions)

#### Answer Submission
- [ ] **Long Text Input** - Student can type/input answer text
- [ ] **Submit Button** - Submit button appears for long text questions
- [ ] **Submit Answer** - Student can submit answer for review
- [ ] **Submit Validation** - Error appears if required field is empty
- [ ] **Character Limit** (Optional) - Validation for max character length if applicable

#### Submission Feedback
- [ ] **Submission Confirmation** - "Answer Submitted for Review" message displays
- [ ] **Button State Changes** - Submit button becomes disabled/changes appearance
- [ ] **Pending Status Shows** - Material shows "Pending" or "Awaiting Review" status
- [ ] **Status Icon Updates** - Status icon changes to pending/hourglass indicator

#### Multiple Submissions
- [ ] **Allow Resubmission** - Student can resubmit answer if allowed (based on teacher grading)
- [ ] **Resubmit After Needs Revision** - Student can resubmit after teacher marks "Needs Revision"
- [ ] **Cannot Resubmit After Approved** - Submit button disabled after approved (if applicable)
- [ ] **Latest Submission Shown** - Most recent submission visible to student

#### Data Persistence
- [ ] **Submission Saved** - Student's answer persists in database
- [ ] **Timestamp Recorded** - Submission timestamp recorded for audit
- [ ] **Submission Visible to Teacher** - Answer appears in teacher assessment queue

---

### Flow 4: Teacher - Assess Submissions

Location: `/wp-admin/` (Assessment Queue page/interface)

#### Assessment Queue Access
- [ ] **Assessment Queue Accessible** - Teacher can navigate to assessment queue
- [ ] **Queue Location** - Assessment queue accessible from admin menu or dedicated page
- [ ] **Only Pending Visible** - Queue shows only pending (not yet graded) submissions
- [ ] **Correct Student Filter** - Queue shows submissions from own students/courses
- [ ] **Sortable Submissions** - Queue can be sorted by student name, submission date, etc.
- [ ] **Pagination** (Optional) - Large queues support pagination

#### Finding Submissions
- [ ] **Search/Filter** - Teacher can search for specific student submissions
- [ ] **Filter by Course** - Teacher can filter submissions by course
- [ ] **Filter by Student** - Teacher can filter submissions by student name
- [ ] **Shows Course Context** - Queue shows which course/step the submission belongs to
- [ ] **Shows Student Name** - Student name displays clearly for identification

#### Reviewing Submissions
- [ ] **Open Submission** - Teacher can click to open and review submission
- [ ] **View Answer Text** - Full student answer text displays
- [ ] **View Course Context** - Question/assignment text displays alongside answer
- [ ] **View Submission Date** - Submission timestamp displays
- [ ] **View Student Info** - Student name and course enrollment info visible

#### Grading Interface
- [ ] **Grade Options Display** - Approved/Needs Revision options appear
- [ ] **Select Approval Status** - Teacher can select "Approved" status
- [ ] **Select Needs Revision Status** - Teacher can select "Needs Revision" status
- [ ] **Status Visualization** - Selected status clearly highlighted/indicated

#### Feedback Entry
- [ ] **Feedback Text Field** - Text area for teacher feedback appears
- [ ] **Enter Feedback** - Teacher can type feedback comments
- [ ] **Character Limit** (Optional) - Max character length if applicable
- [ ] **Rich Text Support** (Optional) - Basic formatting if needed

#### Submission
- [ ] **Submit Grade Button** - Button to submit grading decision appears
- [ ] **Submit Grade** - Teacher can submit grade and feedback
- [ ] **Validation** - Error if required fields (status, maybe feedback) are empty
- [ ] **Submission Confirmation** - Success message after submitting grade

#### Queue Management
- [ ] **Remove from Queue** - Graded submission removed from queue
- [ ] **Queue Updates** - Queue count/total updates after submission
- [ ] **Next Submission** - UI advances to next submission or returns to queue list
- [ ] **Completion Count** - Total graded submissions counter updates

#### Edge Cases
- [ ] **No Pending Submissions** - Message displays when queue is empty
- [ ] **No Permission** - Non-teacher users cannot access assessment queue
- [ ] **Student Course Filter** - Teachers only see their own students' submissions
- [ ] **Concurrent Grading** - Handle if another teacher grades same submission concurrently (optional)

---

### Flow 5: Student - View Feedback

Location: `/course/{courseSlug}/step-{stepNumber}`

#### Feedback Display
- [ ] **Feedback Appears** - Teacher feedback displays on course step page for submitted answer
- [ ] **Feedback Visible** - Feedback text is clearly visible and readable
- [ ] **Feedback Matches Submission** - Feedback is associated with correct answer/question
- [ ] **Multiple Feedbacks** (Optional) - If student submitted multiple times, show feedback history

#### Status Updates
- [ ] **Approved Status Shows** - Material shows "Approved" status with checkmark
- [ ] **Approved Icon** - Visual icon indicates approved status
- [ ] **Needs Revision Status Shows** - Material shows "Needs Revision" with warning icon
- [ ] **Needs Revision Icon** - Clear visual indicator for needs revision status
- [ ] **Status Change Reflects** - Progress indicator updates to show approved/revision needed

#### Feedback Interaction
- [ ] **Feedback Expandable** (Optional) - Feedback can be expanded/collapsed if needed
- [ ] **Feedback Readable** - Feedback text displays with good readability (font size, contrast)
- [ ] **Teacher Name/Identifier** (Optional) - Shows which teacher provided feedback
- [ ] **Feedback Timestamp** (Optional) - Shows when feedback was provided

#### Revision Handling
- [ ] **Resubmit Option** - If "Needs Revision", student sees option to resubmit
- [ ] **Resubmit Button** - Clear button/link to resubmit answer
- [ ] **Resubmit Works** - Student can click and resubmit revised answer
- [ ] **New Feedback Appears** - When re-graded, new feedback replaces old feedback
- [ ] **Feedback History** (Optional) - Previous feedback visible if keeping history

#### Progress Implications
- [ ] **Progress Locked** - If approved, cannot resubmit (material considered complete)
- [ ] **Progress Pending** - While awaiting feedback, shows pending in progress counter
- [ ] **Progress Counts Complete** - Approved materials count toward "X of Y completed"
- [ ] **Course Progress Updates** - Overall course progress reflects material completion

#### Edge Cases
- [ ] **No Feedback Yet** - Message displays when teacher hasn't graded yet
- [ ] **Feedback for Own Answer** - Student only sees feedback for their own submission
- [ ] **Cannot See Other Students' Feedback** - Other students' feedback not visible
- [ ] **Archived/Old Feedback** - Can still view feedback after completing step

---

## Testing Infrastructure Requirements

### Data Setup Needed
- Test course program and levels in database
- Test user accounts (admin, teacher, students)
- Test course enrollments and relationships
- Seed course materials for testing (or create via tests)

### API Endpoints to Verify Exist
- `POST /api/course-materials` - Create material
- `GET /api/course-materials/{id}` - Get material
- `PUT /api/course-materials/{id}` - Update material
- `DELETE /api/course-materials/{id}` - Delete material
- `GET /api/student-progress/{courseId}/{studentId}` - Get student progress
- `POST /api/student-progress/mark-complete` - Mark material complete
- `POST /api/student-answers/submit` - Submit answer
- `GET /api/teacher/assessment-queue` - Get pending submissions
- `POST /api/teacher/grade-submission` - Submit grade/feedback
- `GET /api/student-feedback/{answerId}` - Get feedback on submission

### Component Data-Testid Attributes
Ensure these are present for reliable selectors:
- `data-testid="course-materials-admin-page"` - Admin page container
- `data-testid="material-item-{materialId}"` - Each material in list
- `data-testid="student-material-{materialId}"` - Each student material
- `data-testid="material-status-icon"` - Status indicators
- `data-testid="progress-indicator"` - Progress counter/bar
- `data-testid="submit-answer-button"` - Answer submission button
- `data-testid="grade-submission-button"` - Teacher grading button
- `data-testid="feedback-display"` - Feedback container
- `data-testid="assessment-queue-item-{submissionId}"` - Queue items

### Browser Environment
- Must have authentic course data in test database
- Tests should run in isolated test user context
- Session/auth cookies must be properly set
- Network isolation for API calls (or mock where needed)

---

## Recommended Testing Priority

### Phase 1: Foundation (Core Student Learning)
High priority - covers main use case
- Flow 2: Student self-study with rich text and videos
- Flow 2: Student multiple choice interaction
- Basic progress tracking

### Phase 2: Admin & Submission
Medium priority - data creation and assessment
- Flow 1: Admin creating materials (prerequisites for Phase 1)
- Flow 3: Student submitting long text answers
- Basic teacher assessment flow

### Phase 3: Teacher Workflow & Feedback Loop
Medium priority - completes end-to-end
- Flow 4: Teacher assessment queue and grading
- Flow 5: Student viewing feedback
- Full feedback loop testing

### Phase 4: Edge Cases & Polish
Low priority - robustness and accessibility
- Error handling
- Validation
- Mobile responsiveness
- Accessibility (keyboard navigation)
- Concurrent user scenarios

---

## Notes

1. **API Contract First**: Before writing tests, ensure all API endpoints are implemented and documented
2. **Test Data**: Use a consistent test course and course program for all tests
3. **Isolated Tests**: Each test should be independent and not rely on state from other tests
4. **Cleanup**: After each test, clean up any created data (or use database transactions for rollback)
5. **Performance**: Consider test speed - slow tests impact developer velocity
6. **Maintainability**: Use page object models or helper functions to reduce duplication

---

## Updating This Document

As tests are implemented:
1. Mark each test as "✅ DONE" when implemented
2. Update the total coverage percentage
3. Move completed tests to a "Recently Implemented" section
4. Keep this as the source of truth for test coverage

Current coverage: **~5%** (2 tests out of 40+ needed)
