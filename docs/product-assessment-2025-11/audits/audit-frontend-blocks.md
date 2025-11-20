# Audit Template: Frontend Gutenberg Blocks

**Purpose:** Review WordPress Gutenberg blocks for code quality, performance, and UX  
**Estimated Time:** 3-4 hours  
**When to Run:** After major frontend changes or quarterly

## Audit Checklist

### 1. Block Inventory

Verify all blocks registered and functional:

**Student Dashboard Blocks:**
- [ ] login-auth
- [ ] student-dashboard-hero
- [ ] student-calendar
- [ ] student-upcoming-sessions
- [ ] student-class-credits
- [ ] student-course-enrollments
- [ ] student-package-details
- [ ] student-stats-widget

**Teacher Dashboard:**
- [ ] teacher-calendar
- [ ] teacher-profile-form
- [ ] teacher-stats-widget
- [ ] teacher-info

**Course Pages:**
- [ ] course-list
- [ ] course-header
- [ ] course-cohorts
- [ ] course-sessions-calendar
- [ ] course-details
- [ ] course-materials

**Booking:**
- [ ] booking-session-details
- [ ] package-selection
- [ ] conditional-stripe-payment
- [ ] session-selection-wizard

### 2. Code Quality

For each block, check:

- [ ] TypeScript types used (no `any`)
- [ ] API calls use `thriveClient` from `@thrive/shared`
- [ ] Error handling with user-friendly messages
- [ ] Loading states shown during API calls
- [ ] Props validated with PropTypes or TypeScript
- [ ] No console.log/console.error in production build
- [ ] CSS scoped to block (no global pollution)

### 3. Performance

- [ ] React.memo used for expensive components
- [ ] useCallback/useMemo for derived state
- [ ] Large lists virtualized (react-window)
- [ ] Images lazy-loaded
- [ ] Bundle size reasonable (<100KB per block)

Run bundle analysis:
```bash
cd apps/wordpress/themes/custom-theme
pnpm run build --analyze
```

### 4. Accessibility

- [ ] Semantic HTML (use correct heading levels)
- [ ] ARIA labels on interactive elements
- [ ] Keyboard navigation works
- [ ] Focus visible on interactive elements
- [ ] Color contrast meets WCAG AA (4.5:1 for text)
- [ ] Screen reader testing with VoiceOver/NVDA

### 5. Responsive Design

Test on:
- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

### 6. User Experience

- [ ] Clear call-to-actions
- [ ] Empty states show helpful messages
- [ ] Error messages actionable ("Try again" not just "Error")
- [ ] Success feedback (toasts, animations)
- [ ] Consistent UI patterns across blocks

---

## Testing Checklist

### Manual Testing per Block

**Student Calendar Block:**
- [ ] Loads student's booked sessions
- [ ] Month navigation works
- [ ] Clicking session opens modal
- [ ] Filter by session type works
- [ ] Mobile responsive

(Repeat for each block)

### Automated Testing

```bash
# Run E2E tests
cd tests
pnpm playwright test
```

- [ ] Critical user flows have E2E coverage
- [ ] Component tests for reusable components

---

## Findings Template

**Finding ID:** BLOCK-001  
**Block Name:** student-calendar  
**Severity:** High | Medium | Low  
**Category:** Bug | UX | Performance | Accessibility | Code Quality  
**Description:** Calendar doesn't load on mobile Safari  
**Steps to Reproduce:** Open /dashboard on iPhone, scroll to calendar  
**Expected:** Calendar displays with sessions  
**Actual:** Blank white box  
**Recommendation:** Add Safari-specific CSS fix  
**Effort:** 1 hour  

---

**Document findings below:**

### Bugs

### UX Issues

### Performance Issues

### Accessibility Issues

### Positive Observations
