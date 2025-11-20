# Audit Template: Backend API Endpoints

**Purpose:** Comprehensive review of all NestJS controllers and API endpoints  
**Estimated Time:** 4-6 hours  
**When to Run:** Quarterly or after major feature additions

## Audit Checklist

### 1. Controller Inventory

Review each controller and verify:

- [ ] All endpoints documented with Swagger decorators
- [ ] Proper HTTP methods used (GET, POST, PATCH, DELETE)
- [ ] Authentication guards applied where needed (`@UseGuards(JwtAuthGuard)`)
- [ ] Role-based access control implemented (`@Roles('admin')`)
- [ ] Request validation with DTOs/Zod schemas
- [ ] Response types match shared TypeScript types

**Controllers to Review:**
- [ ] AuthController (`/auth`)
- [ ] UsersController (`/users`)
- [ ] TeachersController (`/teachers`)
- [ ] StudentsController (`/students`)
- [ ] SessionController (`/sessions`)
- [ ] BookingsController (`/bookings`)
- [ ] PackagesController (`/packages`)
- [ ] AdminPackagesController (`/admin/packages`)
- [ ] PaymentsController (`/payments`)
- [ ] WebhooksController (`/webhooks`)
- [ ] CourseProgramsController (`/course-programs`)
- [ ] EnrollmentController (`/course-programs/:code/cohorts`)
- [ ] GroupClassesController (`/group-classes`)
- [ ] CourseMaterialsController (`/course-materials`)
- [ ] LevelsController (`/levels`)
- [ ] PoliciesController (`/policies`)
- [ ] WaitlistsController (`/waitlists`)

### 2. Security Audit

- [ ] No sensitive data in logs (passwords, tokens)
- [ ] SQL injection protection (TypeORM parameterized queries)
- [ ] CORS configured correctly
- [ ] Rate limiting on auth endpoints
- [ ] Webhook signature verification (Stripe)
- [ ] Input sanitization on all user-provided data

### 3. Error Handling

- [ ] All endpoints return consistent error format
- [ ] 4xx errors for client mistakes
- [ ] 5xx errors for server issues
- [ ] Validation errors return field-specific messages
- [ ] Database errors caught and logged (not exposed to client)

### 4. Performance

- [ ] N+1 query problems identified (use eager loading)
- [ ] Large result sets paginated
- [ ] Expensive operations run async (webhooks, emails)
- [ ] Database indexes on foreign keys

### 5. Testing Coverage

Run coverage report:
```bash
cd apps/nestjs
pnpm test:cov
```

Target: >80% coverage on services, >60% on controllers

- [ ] Unit tests for all services
- [ ] Integration tests for critical flows (booking, payment)
- [ ] E2E tests for main user journeys

---

## Findings Template

**Finding ID:** API-001  
**Severity:** High | Medium | Low  
**Category:** Security | Performance | Code Quality | Documentation  
**Description:** Missing auth guard on sensitive endpoint  
**Endpoint:** `GET /admin/students`  
**Recommendation:** Add `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles('admin')`  
**Effort:** 5 minutes  

---

**Document findings below:**

### Critical Findings

(High-severity issues requiring immediate attention)

### Medium Priority

(Important but not urgent)

### Low Priority

(Nice-to-have improvements)

### Positive Observations

(Things done well worth highlighting)
