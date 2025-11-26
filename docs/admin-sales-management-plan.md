# Admin Sales & Revenue Management Interface Plan

## Current State Analysis

### Existing Admin Features (thrive-admin WordPress plugin)
The current admin interface provides:

1. **Dashboard** - Basic overview with API connection test
2. **User Management** - List, search, filter users; promote/demote admin/teacher roles
3. **Packages Admin** - CRUD for credit packages (Stripe products)
4. **Group Classes** - Calendar/table view, create/manage sessions
5. **Courses Admin** - Course programs, steps, cohorts management
6. **Settings** - Configuration options
7. **Testimonials Admin** - Manage testimonials

### Data Available but Not Surfaced to Admin

| Entity | Location | Key Data |
|--------|----------|----------|
| **Orders** | `order` table | All purchases with status, totals, Stripe IDs |
| **Order Items** | `order_item` table | Line item details, pricing snapshots |
| **Bookings** | `booking` table | Session reservations, status, cancellations |
| **Student Packages** | `student_package` table | Purchased packages, credits, expiration |
| **Package Uses** | `package_use` table | Credit consumption, session associations |
| **Stripe Events** | Via webhooks | Payment intents, refunds, disputes |

---

## Proposed Admin Features

### Phase 1: Sales Dashboard & Order Management (High Priority)

#### 1.1 Sales Dashboard Widget
**Location**: Admin Dashboard enhancement

**Features**:
- **Today's Revenue**: Total payments received today
- **This Week/Month Summary**: Aggregated revenue with comparison to previous period
- **Active Subscriptions**: Count of students with non-expired packages
- **Recent Transactions**: Last 5 transactions with quick links
- **Key Metrics Cards**:
  - Total revenue (MTD/YTD)
  - New package purchases
  - Booking count
  - Cancellation rate

**API Endpoint (new)**:
```typescript
GET /admin/dashboard/sales-summary
Response: {
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  yearRevenue: number;
  previousPeriodComparison: { week: number; month: number };
  activeStudentPackages: number;
  totalBookingsThisMonth: number;
  cancellationRate: number;
  recentTransactions: Transaction[];
}
```

#### 1.2 Orders Management Page
**Location**: New admin menu item "Sales" or "Orders"

**Features**:
- **Order List Table**:
  - Columns: Order ID, Student Name, Date, Total, Status, Payment Method
  - Filters: Date range, Status (paid/pending/cancelled/refunded), Payment type
  - Search: By student name/email, order ID, Stripe ID
  - Export: CSV/Excel export

- **Order Detail View**:
  - Order summary with all line items
  - Student info with link to user profile
  - Stripe payment link (opens Stripe Dashboard)
  - Related bookings list
  - Refund action (initiates Stripe refund workflow)
  - Notes/comments section

**API Endpoints (new)**:
```typescript
GET /admin/orders
Query: { page, limit, status, dateFrom, dateTo, search }

GET /admin/orders/:id
Response: Order with items, student, bookings

POST /admin/orders/:id/refund
Body: { amount?: number; reason: string }
```

#### 1.3 Student Package Management
**Location**: Enhancement to existing Users page OR new dedicated page

**Features**:
- **Package List** (admin can see all student packages):
  - Student name, package name, purchased date, expiry, remaining credits
  - Filter by: active/expired, package type, student
  - Quick actions: View details, adjust credits, extend expiry

- **Individual Package View**:
  - Credit balance breakdown by allowance type
  - Usage history (package_use records)
  - Associated bookings
  - Manual credit adjustment with audit trail

**API Endpoints (new)**:
```typescript
GET /admin/student-packages
Query: { page, limit, studentId?, active?, packageType? }

GET /admin/student-packages/:id
Response: Full package with uses, allowances, bookings

POST /admin/student-packages/:id/adjust-credits
Body: { allowanceId: number; creditDelta: number; reason: string }

POST /admin/student-packages/:id/extend
Body: { newExpiryDate: string; reason: string }
```

---

### Phase 2: Revenue Analytics & Reporting (Medium Priority)

#### 2.1 Revenue Reports Page
**Features**:
- **Time-series Charts**:
  - Daily/weekly/monthly revenue trends
  - Revenue by product type (packages, sessions, courses)
  - Comparison overlays (this period vs previous)

- **Breakdown Tables**:
  - Revenue by package type
  - Revenue by teacher (for private sessions)
  - Revenue by student cohort/level

- **Export Options**: PDF reports, CSV data export

**API Endpoints (new)**:
```typescript
GET /admin/reports/revenue
Query: { 
  startDate: string;
  endDate: string;
  groupBy: 'day' | 'week' | 'month';
  breakdown?: 'package' | 'teacher' | 'service_type';
}
```

#### 2.2 Student Activity Report
**Features**:
- Active vs inactive students
- Credit utilization rates
- Popular booking times/teachers
- Churn indicators (students with expiring packages)

---

### Phase 3: Operational Tools (Medium Priority)

#### 3.1 Booking Management Enhancement
**Enhance existing booking views**:
- **Admin Booking List** (all bookings, not just per-user):
  - Filter by date range, teacher, status, type
  - Bulk status updates
  - No-show marking with credit handling
  
- **Reschedule Flow**:
  - Admin can reschedule any booking
  - Automatic notification to student
  - Credit handling for policy violations

**API Endpoints (new)**:
```typescript
GET /admin/bookings
Query: { page, limit, teacherId?, status?, dateFrom?, dateTo?, type? }

POST /admin/bookings/:id/reschedule
Body: { newSessionId?: number; newTime?: { start: string; end: string }; reason: string }

POST /admin/bookings/:id/mark-no-show
Body: { refundCredits: boolean; reason?: string }
```

#### 3.2 Credit & Promo Management
**Features**:
- **Manual Credit Grants**: Give credits to students (comps, resolutions)
- **Promo Codes** (future): Create discount codes for packages
- **Bulk Operations**: Grant credits to multiple students

**API Endpoints (new)**:
```typescript
POST /admin/credits/grant
Body: { 
  studentIds: number[]; 
  serviceType: ServiceType;
  credits: number;
  creditUnitMinutes: number;
  expiresInDays?: number;
  reason: string;
}
```

---

### Phase 4: Notifications & Alerts (Lower Priority)

#### 4.1 Admin Notifications
**Features**:
- Failed payment alerts
- High-value order notifications
- Cancellation spike alerts
- Package expiry reminders (for follow-up)

#### 4.2 Email Automation Dashboard
**Features**:
- View/manage scheduled reminder emails
- Override/cancel specific notifications
- Template preview

---

## Implementation Priority Matrix

| Feature | Business Value | Dev Effort | Priority |
|---------|---------------|------------|----------|
| Sales Dashboard Widget | High | Low | P0 |
| Orders List & Detail | High | Medium | P0 |
| Student Packages Admin | High | Medium | P0 |
| Revenue Reports | Medium | Medium | P1 |
| Admin Booking Management | Medium | Low | P1 |
| Credit Grant Tool | High | Low | P1 |
| Export Functionality | Medium | Low | P1 |
| Student Activity Reports | Low | Medium | P2 |
| Promo Codes | Medium | High | P2 |
| Admin Notifications | Low | Medium | P3 |

---

## Technical Approach

### Backend (NestJS)

1. **New Module**: `AdminSalesModule` or extend existing admin controllers
   - `AdminOrdersController` - CRUD for orders
   - `AdminReportsController` - Analytics endpoints
   - `AdminCreditsController` - Manual credit operations

2. **Services**:
   - `OrdersService` - Query and manipulate orders
   - `ReportsService` - Aggregation queries, caching
   - `CreditGrantService` - Manual credit operations with audit

3. **Database Considerations**:
   - Add `admin_credit_grant` table for audit trail
   - Consider materialized views for reporting performance
   - Index optimization for date-range queries

### Frontend (thrive-admin Vue)

1. **New Components**:
   - `SalesOverview.vue` - Dashboard widget
   - `OrdersList.vue` - Paginated order table
   - `OrderDetail.vue` - Single order view
   - `StudentPackagesAdmin.vue` - Package management
   - `RevenueChart.vue` - Chart.js integration
   - `CreditGrantModal.vue` - Grant credits form

2. **New Pages/Routes**:
   - `/thrive-admin-orders` - Orders management
   - `/thrive-admin-reports` - Revenue reports
   - `/thrive-admin-credits` - Credit management

3. **Shared Components**:
   - DataTable with filtering/sorting/export
   - DateRangePicker
   - StatCard for metrics display

---

## Quick Wins (Can Implement Immediately)

1. **Add "View in Stripe" links** to existing package list
2. **Basic order list endpoint** pulling from existing `order` table
3. **Student package list** with remaining credits calculation
4. **Dashboard revenue counter** (simple sum query)

---

## Security Considerations

- All endpoints protected by `AdminGuard`
- Audit logging for sensitive operations (refunds, credit adjustments)
- Rate limiting on export endpoints
- Stripe refund operations require confirmation

---

## Questions for Discussion

1. Should refunds be handled entirely in Stripe Dashboard or provide in-app workflow?
2. How detailed should the audit trail be for credit adjustments?
3. Do we need role-based access (e.g., finance admin vs general admin)?
4. What's the reporting frequency requirement (real-time vs daily aggregation)?
5. Should we integrate with external analytics (e.g., Metabase, Google Analytics)?
