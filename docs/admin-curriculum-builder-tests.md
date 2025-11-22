# Admin Curriculum Builder E2E Tests

This document describes the Playwright E2E test suite for the Admin Curriculum Builder improvements, including drag-and-drop step reordering, step editing, and course filtering.

## Test File Location

- **Main test file**: `tests/e2e/admin-curriculum-builder.spec.ts`
- **Configuration**: `playwright.config.ts` (root)

## Features Tested

### 1. **Course List View**
- Display of all courses with title, code, and status
- Loading states
- Course action buttons (Manage Steps, Manage Cohorts, Edit, Deactivate)
- Empty state handling

### 2. **Course Filtering**
- **Status Filter**: Active/Inactive/All
- **Level Filter**: Filter by student level
- Course count display
- Filter persistence and reset

### 3. **Step Management Modal**
- Opening/closing the modal
- Displaying existing steps
- Form to add new steps with validation

### 4. **Drag-and-Drop Step Reordering**
- Visual drag handle on each step
- Dragging steps to reorder them
- Persistence of new order after modal close
- Sequential API calls to update step order

### 5. **Step Editing**
- Edit button for each step
- Form population with existing step data
- Updating step title, description, required status
- Cancel edit to reset form
- Form title and button text changes (Edit Step → Update Step)

### 6. **UX Enhancements**
- Course row hover effects
- Step counter display
- Status badges with color coding (Active/Inactive)
- Stripe publication status badges
- Teacher-friendly labels and descriptions

### 7. **Accessibility & Navigation**
- Proper heading hierarchy
- Labeled form inputs
- Keyboard accessible close button
- Screen reader text (sr-only)

## Prerequisites

### 1. **Test Environment Setup**

Ensure your `.env.test` file is configured:

```bash
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root
DB_DATABASE=wordpress_test

# Session & Auth
SESSION_SECRET=test_session_secret_for_jwt_cookies

# Other required variables
GOOGLE_CLIENT_ID=test
GOOGLE_CLIENT_SECRET=test
```

### 2. **Test Users**

The tests use the following admin account:
- **Email**: `admin@thrive.com`
- **Password**: `thrive_test_123`

Create test users by running:

```bash
# From the root directory
npm run seed:test-users
```

Or from the NestJS app:

```bash
cd apps/nestjs
npm run seed:test-users
```

### 3. **Test Database**

Ensure the test database exists and migrations have been run:

```bash
# The database should be created and migrations run by the CI/test setup
# For local testing, ensure docker-compose is running:
docker-compose up -d
```

### 4. **Admin Access**

Ensure the admin user has access to the course management interface:
- Navigate to `/wp-admin/admin.php?page=thrive-courses`
- Or access via the WordPress admin menu

## Running the Tests

### Run All E2E Tests

```bash
# From root directory
npm run test:e2e
```

### Run Only Curriculum Builder Tests

```bash
# From root directory
npm run test:e2e -- tests/e2e/admin-curriculum-builder.spec.ts
```

### Run Specific Test Suite

```bash
# Run only step reordering tests
npm run test:e2e -- tests/e2e/admin-curriculum-builder.spec.ts --grep "Drag and Drop"

# Run only filtering tests
npm run test:e2e -- tests/e2e/admin-curriculum-builder.spec.ts --grep "Filters"

# Run only step editing tests
npm run test:e2e -- tests/e2e/admin-curriculum-builder.spec.ts --grep "Step Editing"
```

### Run in Debug Mode

```bash
# Interactive debug mode with inspector
npm run test:e2e -- tests/e2e/admin-curriculum-builder.spec.ts --debug
```

### Run in UI Mode (Recommended for Development)

```bash
# Visual test runner with step-by-step playback
npm run test:e2e -- tests/e2e/admin-curriculum-builder.spec.ts --ui
```

### Run with Video Recording

```bash
# Records videos of failing tests
npm run test:e2e -- tests/e2e/admin-curriculum-builder.spec.ts --video=on
```

## Test Structure

Each test is organized into logical groups using `test.describe()`:

```typescript
test.describe('Admin Curriculum Builder', () => {
  // Setup/teardown
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  // Test groups
  test.describe('Course List View', () => {
    // Individual tests...
  });

  test.describe('Course Filters', () => {
    // Individual tests...
  });

  // etc.
});
```

## Helper Functions

The test suite includes helper functions for common operations:

### `loginAsAdmin(page)`
- Navigates to homepage
- Clicks sign in button
- Fills admin credentials
- Verifies login completion

### `logout(page)`
- Clicks sign out button
- Verifies logout completion

### `navigateToCoursesAdmin(page)`
- Navigates to the course management admin page
- Waits for page to load

## Key Test Patterns

### Waiting for Elements
```typescript
// Wait for element visibility
await expect(element).toBeVisible({ timeout: 10000 });

// Wait for page load
await page.waitForLoadState('networkidle');
```

### Element Selection
```typescript
// Preferred: Use semantic selectors
page.getByRole('button', { name: 'Save' });
page.getByRole('heading', { name: 'Course Programs Management' });

// Alternative: CSS selectors
page.locator('.button-class');
```

### Verification
```typescript
// Check text content
await expect(element).toContainText('Expected text');

// Check visibility
await expect(element).toBeVisible();

// Check class
await expect(element).toHaveClass(/class-name/);

// Check count
expect(await elements.count()).toBeGreaterThan(0);
```

## Common Issues & Solutions

### Issue: Tests Can't Find Login Button
**Solution**: Ensure admin is logged out first. The test assumes starting from unauthenticated state.

### Issue: Modal Doesn't Open
**Solution**: Verify courses exist in the test database. Use `npm run seed:test-users` to create test data.

### Issue: Drag and Drop Tests Fail
**Solution**:
- Ensure `vuedraggable` library is installed in the admin plugin
- Check that drag handles have the `.drag-handle` class
- Drag operations may need `{ force: true }` option

### Issue: Tests Timeout on Course Load
**Solution**:
- Verify Nginx and API are running: `docker-compose ps`
- Check API logs: `docker-compose logs nestjs`
- Ensure test database has course data

### Issue: Filter Tests Show Different Course Counts
**Solution**: This may be expected if your test database has varied course states. Use the test user setup to ensure consistent data.

## Troubleshooting

### Enable Debug Logging
```typescript
// In test file:
page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
page.on('request', req => console.log(`>> ${req.method()} ${req.url()}`));
page.on('response', res => console.log(`<< ${res.status()} ${res.url()}`));
```

### Check Network Requests
```bash
# Use the browser console in UI mode to inspect network traffic
npm run test:e2e -- --ui
# In the UI, switch to Network tab to see API calls
```

### Save HTML Snapshot
```typescript
// In test, before assertion:
await page.evaluate(() => {
  console.log(document.documentElement.outerHTML);
});
```

### Check Element Visibility
```typescript
// Add pause to inspect page state
await page.pause();
```

## CI/CD Integration

The tests are configured to run in CI pipelines:

- **Retries**: 2 retries on CI (1 locally)
- **Parallel Workers**: Limited to 1 in CI for stability
- **Trace Recording**: Enabled on first retry
- **Reporter**: List format (console output)

For GitHub Actions or other CI platforms, the configuration in `playwright.config.ts` will:
1. Run tests serially for consistency
2. Record traces for failed tests
3. Retry failures automatically
4. Report results to console

## Manual Verification Checklist

In addition to automated tests, manually verify:

- [ ] Drag handles appear on all steps
- [ ] Dragging a step smoothly reorders it
- [ ] Step order persists after page reload
- [ ] Editing a step and canceling doesn't save changes
- [ ] Filters update course list immediately
- [ ] Status badges show correct colors (green for Active, red for Inactive)
- [ ] Modal closes when clicking X button or backdrop
- [ ] Form validation shows helpful error messages
- [ ] Empty states display when no courses match filter

## Related Documentation

- **Implementation Guide**: `docs/course-materials.md`
- **Test Plan**: `docs/course-materials-e2e-test-plan.md`
- **Test Gaps Analysis**: `docs/course-materials-test-gaps.md`
- **Platform Architecture**: `CLAUDE.md` (section 2-3 for auth flow)

## Test Statistics

**Total Test Cases**: 41

| Category | Count |
|----------|-------|
| Course List View | 4 |
| Course Filters | 6 |
| Step Management Modal | 5 |
| Drag and Drop Reordering | 3 |
| Step Editing | 4 |
| UX Enhancements | 4 |
| Create/Edit Course Tab | 3 |
| Accessibility & Navigation | 3 |

**Estimated Run Time**: 8-12 minutes (depending on system and retries)

## Future Test Enhancements

Potential additions for broader coverage:

1. **Teacher Perspective Tests**
   - View and interact with published courses
   - Access student progress tracking
   - View student submissions

2. **Student Flow Tests**
   - Enroll in course
   - Complete steps and submit materials
   - View feedback from teacher

3. **Data Integrity Tests**
   - Verify database records match UI
   - Test concurrent step modifications
   - Validate API error handling

4. **Performance Tests**
   - Test with large number of courses (100+)
   - Test with large step descriptions/media
   - Monitor page load times

5. **Mobile/Responsive Tests**
   - Test admin interface on tablet/mobile
   - Verify responsive drag-and-drop
   - Check mobile form layout

## Contributing

When adding new tests:

1. Follow the existing pattern of test groups and helper functions
2. Use semantic selectors (`getByRole`, `getByText`) over CSS selectors
3. Wait for network idle before assertions
4. Add meaningful test descriptions
5. Include comments for complex interactions
6. Test both success and edge cases
7. Update this document with new test categories

## Support

For issues or questions:

1. Check the "Common Issues & Solutions" section above
2. Review Playwright documentation: https://playwright.dev
3. Check existing test patterns in `tests/e2e/` directory
4. Consult the component implementation files:
   - `apps/wordpress/plugins/thrive-admin/src/components/courses/CoursesAdmin.vue`
   - `apps/wordpress/plugins/thrive-admin/src/components/courses/ManageStepsModal.vue`
