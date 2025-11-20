# Task 01: Admin Curriculum Builder UI

**Priority:** CRITICAL (Blocks MVP)
**Estimate:** 3-4 days
**Complexity:** Medium
**Dependencies:** None (backend ready, partial frontend exists)

## Objective

Complete the Vue.js admin interface in the `thrive-admin` WordPress plugin for managing course programs. The core CRUD is implemented, but critical usability features like drag-and-drop reordering and step editing are missing.

## Current State

✅ **Backend Complete:**
- API endpoints exist and are functional.
- Database schema supports courses, steps, options.
- TypeScript types defined in `@thrive/shared`.

⚠️ **Frontend Partially Complete:**
- ✅ Course List & CRUD (`CoursesAdmin.vue`) implemented.
- ✅ Basic Step Management (`ManageStepsModal.vue`) implemented (Add/Delete/Attach Options).
- ✅ Cohort Management (`ManageCohortsModal.vue`) implemented.
- 🔴 **Missing:** Drag-and-drop reordering for steps.
- 🔴 **Missing:** Ability to edit existing steps (Title, Description, Required status).
- 🔴 **Missing:** UX polish for empty states and list visualization.

## Outstanding Work

### 1. Implement Drag-and-Drop Step Reordering

**File:** `apps/wordpress/plugins/thrive-admin/src/components/courses/ManageStepsModal.vue`

**Requirements:**
- Install and integrate `vuedraggable`.
- Allow users to drag steps to reorder them.
- Update `stepOrder` for all affected steps upon drop.
- Send batch update to backend (or update individually) to persist order.
- **UX:** Add a "drag handle" icon to each step card.

### 2. Implement Step Editing

**File:** `apps/wordpress/plugins/thrive-admin/src/components/courses/ManageStepsModal.vue`

**Requirements:**
- Add "Edit" button to each step card.
- When clicked, populate the "Add Step" form (or a modal) with the step's data.
- Change "Add Step" button to "Update Step".
- Handle `PUT /admin/course-programs/steps/:stepId` on save.
- Allow cancelling edit mode.

### 3. UX Improvements

**Files:** `CoursesAdmin.vue`, `ManageStepsModal.vue`

**Requirements:**
- **Course List:**
    - Add filters for "Active/Inactive" and "Level".
    - Improve empty state with a more inviting "Create your first course" call to action.
- **Step Manager:**
    - Visualize the "flow" better (maybe a connecting line between steps?).
    - Add a confirmation modal for deleting steps (currently uses native `confirm()`).
    - Show "Saved" toast notifications on successful actions.

## Acceptance Criteria

- [ ] Steps can be reordered using drag-and-drop.
- [ ] New step order persists after page reload.
- [ ] Existing steps can be edited (Title, Description, Required).
- [ ] "Edit" mode is clearly distinguishable from "Add" mode.
- [ ] Course list can be filtered by status and level.
- [ ] Native `confirm()` dialogs replaced with custom modals or better UI feedback.
- [ ] All API interactions show proper loading states and error toasts.

## Technical Notes

### Drag-and-Drop Implementation

```bash
pnpm add vuedraggable@next
```

```vue
<draggable 
  v-model="localSteps" 
  item-key="id" 
  handle=".drag-handle"
  @end="onDragEnd"
>
  <template #item="{ element }">
    <div class="step-card">
      <span class="drag-handle">☰</span>
      <!-- content -->
    </div>
  </template>
</draggable>
```

### API Methods

Ensure `thrive.ts` has methods for:
- `updateCourseStep(stepId, data)` (Exists)
- `updateCourseStepOrder(courseId, steps)` (May need to be added or use batch update)

## Time Breakdown

- Drag-and-drop reordering: 1 day
- Step editing functionality: 1 day
- UX polish & filters: 1 day
- Testing & Refinement: 0.5 days

**Total:** 3.5 days

## Definition of Done

- [ ] All outstanding work items completed.
- [ ] No console errors.
- [ ] Manual testing confirms reordering works reliably.
- [ ] Code follows existing Vue patterns.
