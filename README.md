# TipSathi

TipSathi is a mobile-first restaurant tip tracking and distribution platform designed for restaurants in India.

The application replaces manual end-of-shift tip calculations by connecting every customer tip to the table, shift, waiter, and supporting employees involved in serving that customer.

Employees can enter a unique staff code, select their assigned tables, and view their accumulated tips. Customers can choose a tip amount or percentage during payment, and the platform automatically calculates how the tip should be divided based on restaurant-defined rules.

---

## Product Goal

Build a simple, transparent, and reliable system that allows restaurants to:

* Track tips by table and employee
* Automatically split tips among staff
* Reduce manual calculations
* Prevent disputes over tip distribution
* Give employees visibility into their earnings
* Generate accurate end-of-shift reports
* Support both digital and cash tips

The platform should initially operate as a standalone tip-management tool. Direct payment processing and POS integrations can be added later.

---

## Target Users

### Restaurant Employees

Waiters, runners, bartenders, bussers, captains, and other service staff.

Employees should be able to:

* Log in using a unique employee code or PIN
* Join an active shift
* View assigned tables
* Claim a table when permitted
* Add supporting employees to a table
* View tips earned during the current shift
* View previous shift totals
* View pending and completed payouts

### Restaurant Managers

Managers and restaurant owners should be able to:

* Create and manage employee accounts
* Create shifts
* Assign employees to tables
* Configure tip-distribution rules
* Add or correct tips
* Review cash and digital tips
* Approve shift totals
* Close shifts
* Record payouts
* Export reports
* View audit logs

### Customers

Customers should not need to create an account.

Customers should be able to:

* Open a tipping page using a QR code
* View the bill amount
* Select a suggested tip percentage
* Enter a custom tip amount
* Select no tip
* Confirm the tip
* Optionally provide feedback

---

## Core User Flow

### Employee Shift Flow

1. The employee opens the staff application.
2. The employee enters their unique staff code or PIN.
3. The employee selects or joins an active shift.
4. The employee views their assigned tables.
5. The employee begins serving customers.
6. Tips submitted for those tables are automatically attributed to the appropriate employees.
7. The employee views their running shift total.
8. At the end of the shift, the manager reviews and closes the shift.
9. The employee can view the finalized tip amount.

### Customer Tipping Flow

1. The customer receives their bill.
2. The bill contains a table-specific or bill-specific QR code.
3. The customer scans the QR code.
4. The tipping page displays the bill amount.
5. The customer chooses a tip percentage or custom amount.
6. The customer confirms the tip.
7. The tip is saved and associated with the correct bill, table, and shift.
8. The tip is distributed according to the restaurant’s configured rules.

### Manager Shift Closing Flow

1. The manager opens the active shift.
2. The manager reviews all bills and tips.
3. The manager reviews missing or incorrect table assignments.
4. The manager adds cash tips when necessary.
5. The system calculates final employee allocations.
6. The manager approves the totals.
7. The manager closes the shift.
8. The system prevents ordinary users from modifying finalized allocations.
9. The manager can export a shift report or record payouts.

---

## Example

A customer at Table 12 has a bill of ₹2,000 and chooses a 10% tip.

```text
Bill amount: ₹2,000
Tip percentage: 10%
Tip amount: ₹200
```

The restaurant uses the following distribution rule:

```text
Waiter: 70%
Runner: 15%
Bartender: 10%
Shared staff pool: 5%
```

The system creates these allocations:

```text
Waiter: ₹140
Runner: ₹30
Bartender: ₹20
Shared pool: ₹10
```

Each allocation must be saved as a separate database record so the calculation can be audited later.

---

## MVP Features

### Authentication

* Restaurant administrator login
* Manager login
* Employee login using staff code or PIN
* Secure password hashing for manager accounts
* Secure PIN hashing for employee accounts
* Session-based or token-based authentication
* Role-based authorization

Supported roles:

```text
OWNER
MANAGER
EMPLOYEE
```

Optional employee job types:

```text
WAITER
CAPTAIN
RUNNER
BARTENDER
BUSSER
HOST
KITCHEN
OTHER
```

### Restaurant Management

* Create restaurant
* Edit restaurant name and details
* Configure currency
* Configure timezone
* Create restaurant tables
* Activate or deactivate tables
* Create employee accounts
* Activate or deactivate employees
* Configure default tip percentages
* Configure tip-distribution rules

Default currency:

```text
INR
```

### Shift Management

* Create shift
* Start shift
* Join shift
* Assign employees to tables
* Add multiple employees to one table
* Transfer a table assignment
* End employee participation in a shift
* Close shift
* Reopen shift only with manager permission
* Prevent edits after final approval unless an adjustment is created

Shift statuses:

```text
DRAFT
OPEN
UNDER_REVIEW
CLOSED
PAID
```

### Table Assignments

Each assignment should include:

* Employee
* Table
* Shift
* Role at the table
* Start time
* End time
* Allocation weight
* Whether the assignment is active

The system must support:

* One employee serving multiple tables
* Multiple employees serving one table
* Table transfers during a shift
* Employees joining a table after service begins
* Employees leaving before the shift ends

### Bills

Managers or authorized employees should be able to:

* Create a bill
* Associate a bill with a table
* Enter the bill amount
* Generate a customer tipping link
* Generate a QR code
* Mark a bill as paid
* Cancel a bill
* Refund a bill

Bill statuses:

```text
OPEN
PAID
CANCELLED
REFUNDED
```

### Customer Tips

A tip may be:

* Percentage-based
* Fixed amount
* Custom amount
* Zero
* Cash
* Digital
* Manually entered by a manager

Tip methods:

```text
CASH
DIGITAL
MANUAL
```

Tip statuses:

```text
PENDING
CONFIRMED
CANCELLED
REFUNDED
```

The system must validate that:

* A tip cannot be negative
* A tip must belong to one bill
* A confirmed tip cannot be edited directly
* Corrections must be stored as adjustments
* Refunded tips reverse previous allocations

### Tip Distribution

Support these distribution strategies:

#### Direct Allocation

The employee assigned as the primary waiter receives the entire tip.

#### Weighted Allocation

The tip is divided using percentage weights.

Example:

```text
Waiter: 70
Runner: 15
Bartender: 10
Shared pool: 5
```

Weights must total 100.

#### Equal Table Split

The tip is divided equally among all employees assigned to the table.

#### Hours-Based Pool

All pooled tips are divided based on hours worked during the shift.

#### Points-Based Pool

Employees receive points based on their role.

Example:

```text
Waiter: 10 points
Captain: 12 points
Runner: 6 points
Bartender: 8 points
Busser: 5 points
```

The employee receives:

```text
employee allocation =
employee points / total shift points × pooled tip amount
```

#### Hybrid Distribution

A percentage of the tip is assigned directly to the table staff, and the remainder enters a shared pool.

Example:

```text
Direct table allocation: 80%
Shared pool: 20%
```

### Employee Dashboard

Display:

* Employee name
* Active shift
* Assigned tables
* Current shift tip total
* Direct tips
* Pool tips
* Adjustments
* Finalized shift total
* Pending payout
* Completed payouts
* Recent shift history

Employees must only be able to view their own financial details.

### Manager Dashboard

Display:

* Active shift
* Employees currently working
* Active table assignments
* Open bills
* Total bill value
* Total confirmed tips
* Cash tips
* Digital tips
* Tip percentage average
* Pending review items
* Final employee allocations
* Shift payout status

### Reports

Support reports for:

* Daily tips
* Shift tips
* Employee earnings
* Table performance
* Cash versus digital tips
* Tip adjustments
* Payout history
* Tip percentage trends

Support CSV export in the MVP.

PDF export may be added later.

### Audit Log

Every important action should create an audit record.

Track:

* Employee creation
* Employee deactivation
* Shift creation
* Shift closing
* Table assignment changes
* Tip creation
* Tip cancellation
* Tip refund
* Allocation recalculation
* Manual adjustment
* Payout recording

Each audit record should contain:

* Restaurant ID
* User ID
* Action
* Entity type
* Entity ID
* Previous value
* New value
* Timestamp
* Optional reason

---

## Recommended Technology Stack

### Frontend

Use:

```text
Next.js
TypeScript
React
Tailwind CSS
shadcn/ui
```

Requirements:

* Mobile-first layout
* Responsive design
* Fast loading on lower-cost Android devices
* Accessible forms
* Large touch targets
* Clear Indian currency formatting
* Minimal steps for employees and customers

### Backend

Use:

```text
Next.js App Router
Server Actions or Route Handlers
TypeScript
```

Alternative:

```text
FastAPI
Python
```

For the first implementation, prefer a full-stack Next.js application unless a separate backend becomes necessary.

### Database

Use:

```text
PostgreSQL
Prisma ORM
```

### Authentication

Use one of:

```text
Auth.js
Clerk
Custom session authentication
```

Managers should authenticate using email and password.

Employees should authenticate using:

```text
Restaurant code
Employee code
PIN
```

Do not store employee PINs as plain text.

### Hosting

Recommended:

```text
Vercel
Neon PostgreSQL
Supabase PostgreSQL
```

### QR Codes

Generate QR codes using a maintained Node.js QR code package.

Each QR code should point to a secure customer tipping URL.

Example:

```text
/tip/{publicBillToken}
```

Do not expose internal database IDs in public URLs.

---

## Suggested Application Routes

### Public Routes

```text
/
 /login
 /employee-login
 /tip/[publicToken]
 /tip/[publicToken]/success
```

### Employee Routes

```text
/employee
/employee/shift
/employee/tables
/employee/earnings
/employee/history
```

### Manager Routes

```text
/manager
/manager/employees
/manager/tables
/manager/shifts
/manager/shifts/[shiftId]
/manager/bills
/manager/tips
/manager/rules
/manager/payouts
/manager/reports
/manager/audit
/manager/settings
```

---

## Suggested Database Schema

The following is a conceptual schema. Implement it using Prisma.

### Restaurant

```text
id
name
code
currency
timezone
createdAt
updatedAt
```

### User

Used for owners and managers.

```text
id
restaurantId
name
email
passwordHash
role
isActive
createdAt
updatedAt
```

### Employee

```text
id
restaurantId
name
employeeCode
pinHash
jobType
isActive
createdAt
updatedAt
```

### RestaurantTable

```text
id
restaurantId
name
number
capacity
isActive
createdAt
updatedAt
```

### Shift

```text
id
restaurantId
name
businessDate
status
startedAt
closedAt
closedByUserId
createdAt
updatedAt
```

### ShiftEmployee

```text
id
shiftId
employeeId
clockInAt
clockOutAt
points
hoursWorked
isActive
createdAt
updatedAt
```

### TableAssignment

```text
id
shiftId
tableId
employeeId
assignmentRole
weight
startedAt
endedAt
isPrimary
createdAt
updatedAt
```

### Bill

```text
id
restaurantId
shiftId
tableId
billNumber
publicToken
subtotalAmount
taxAmount
totalAmount
status
openedAt
paidAt
createdAt
updatedAt
```

### Tip

```text
id
restaurantId
billId
amount
percentage
method
status
customerNote
confirmedAt
createdByUserId
createdAt
updatedAt
```

### TipRule

```text
id
restaurantId
name
strategy
isDefault
directPercentage
poolPercentage
configurationJson
isActive
createdAt
updatedAt
```

### TipAllocation

```text
id
restaurantId
shiftId
tipId
employeeId
allocationType
amount
percentage
points
calculationDetailsJson
createdAt
updatedAt
```

### Adjustment

```text
id
restaurantId
shiftId
tipId
employeeId
amount
reason
createdByUserId
createdAt
```

### Payout

```text
id
restaurantId
shiftId
employeeId
amount
status
paymentMethod
reference
approvedByUserId
paidAt
createdAt
updatedAt
```

### AuditLog

```text
id
restaurantId
actorUserId
actorEmployeeId
action
entityType
entityId
previousValueJson
newValueJson
reason
createdAt
```

---

## Tip Calculation Requirements

All monetary calculations must be performed using integer paise rather than floating-point rupee values.

Example:

```text
₹200.50 = 20050 paise
```

Do not use JavaScript floating-point arithmetic for financial calculations.

Use deterministic rounding.

Recommended strategy:

1. Calculate every allocation in paise.
2. Round down each allocation.
3. Calculate the remaining paise.
4. Assign the remaining paise according to a documented rule.
5. Ensure the sum of allocations exactly equals the original tip.

Example:

```text
Original tip: 10000 paise
Allocation total: 10000 paise
```

Never allow:

```text
Allocation total != tip amount
```

Store calculation details in `calculationDetailsJson`.

---

## Business Rules

* Every employee code must be unique within a restaurant.
* Every table number must be unique within a restaurant.
* Only one shift should normally be open for the same business period unless the restaurant supports multiple service areas.
* Employees must belong to the same restaurant as the shift.
* Tables must belong to the same restaurant as the shift.
* A bill must belong to one table and one shift.
* A tip must belong to one bill.
* A finalized tip allocation must not be silently overwritten.
* A closed shift must not be edited without manager authorization.
* Every manual adjustment must include a reason.
* Every payout must reference an employee and shift.
* A payout cannot exceed the employee’s unpaid finalized balance.
* Cancelled bills should not produce active tip allocations.
* Refunded tips must reverse previous allocations.
* Inactive employees should remain visible in historical reports.
* Historical records should not be deleted when an employee is deactivated.

---

## Security Requirements

* Hash passwords using a secure algorithm.
* Hash employee PINs.
* Use HTTP-only secure cookies.
* Protect manager routes.
* Protect employee routes.
* Validate all input on the server.
* Use role-based access control.
* Use rate limiting for PIN login attempts.
* Do not expose sequential database IDs publicly.
* Use random public tokens for bill QR codes.
* Prevent employees from viewing another employee’s earnings.
* Log financial changes.
* Add CSRF protection when required.
* Prevent SQL injection by using Prisma.
* Sanitize customer notes and free-text fields.
* Store secrets in environment variables.

---

## Offline and Poor-Network Support

The application should be optimized for restaurants with unreliable internet access.

For the MVP:

* Show clear loading and error states
* Prevent duplicate form submissions
* Use idempotency keys when submitting tips
* Retry safe requests
* Cache non-sensitive table and shift data
* Preserve unfinished form data locally when appropriate
* Show whether a submission has been confirmed by the server

A future version may include full offline synchronization.

---

## UI Requirements

### General

* Mobile-first
* Clean and simple
* Minimal typing
* Large buttons
* Clear confirmation screens
* Avoid dense tables on mobile
* Use cards for employee and shift summaries
* Use Indian rupee formatting
* Display timestamps in the restaurant timezone

### Employee Login

Fields:

```text
Restaurant code
Employee code
PIN
```

### Employee Home Screen

Show:

```text
Welcome, Employee Name
Current shift
Tables assigned
Tips earned today
Pending payout
```

Primary actions:

```text
View tables
View earnings
Join shift
Log out
```

### Manager Shift Screen

Show:

```text
Shift status
Employees working
Table assignments
Bills
Tips
Unresolved issues
Total allocations
```

Primary actions:

```text
Assign tables
Add bill
Add cash tip
Review allocations
Close shift
Export report
```

### Customer Tip Screen

Show:

```text
Restaurant name
Table number
Bill amount
Suggested tip percentages
Custom tip field
No tip option
Confirm button
```

Suggested tip percentages should be configurable.

Default suggestions:

```text
5%
10%
15%
```

Do not use manipulative or guilt-based language.

---

## API Requirements

Create API routes or server actions for:

### Authentication

```text
POST /api/auth/manager/login
POST /api/auth/employee/login
POST /api/auth/logout
```

### Employees

```text
GET /api/employees
POST /api/employees
GET /api/employees/:id
PATCH /api/employees/:id
```

### Tables

```text
GET /api/tables
POST /api/tables
PATCH /api/tables/:id
```

### Shifts

```text
GET /api/shifts
POST /api/shifts
GET /api/shifts/:id
PATCH /api/shifts/:id
POST /api/shifts/:id/open
POST /api/shifts/:id/review
POST /api/shifts/:id/close
```

### Assignments

```text
POST /api/shifts/:id/assignments
PATCH /api/assignments/:id
DELETE /api/assignments/:id
```

Use soft removal or an end timestamp instead of deleting important historical records.

### Bills

```text
GET /api/bills
POST /api/bills
GET /api/bills/:id
PATCH /api/bills/:id
POST /api/bills/:id/pay
POST /api/bills/:id/cancel
POST /api/bills/:id/refund
```

### Tips

```text
POST /api/public/tips/:publicBillToken
GET /api/tips
GET /api/tips/:id
POST /api/tips/:id/cancel
POST /api/tips/:id/refund
```

### Allocations

```text
POST /api/shifts/:id/calculate
GET /api/shifts/:id/allocations
POST /api/shifts/:id/finalize
```

### Payouts

```text
GET /api/payouts
POST /api/payouts
POST /api/payouts/:id/mark-paid
```

### Reports

```text
GET /api/reports/shift/:shiftId
GET /api/reports/employee/:employeeId
GET /api/reports/daily
GET /api/reports/export
```

---

## Validation

Use a schema-validation library such as Zod.

Validate:

* Email addresses
* Employee codes
* Restaurant codes
* PIN length
* Monetary amounts
* Percentage ranges
* Tip weights
* Shift status transitions
* Bill status transitions
* Tip status transitions
* Restaurant ownership of related records
* Required adjustment reasons

Suggested employee PIN rules:

```text
4 to 6 digits
```

---

## Testing Requirements

Use:

```text
Vitest or Jest
React Testing Library
Playwright
```

### Unit Tests

Test:

* Percentage tip calculation
* Fixed tip calculation
* Weighted allocation
* Equal split
* Hours-based pooling
* Points-based pooling
* Hybrid allocation
* Paise rounding
* Remaining-paise assignment
* Refund reversal
* Payout balance calculation

### Integration Tests

Test:

* Manager creates shift
* Employee joins shift
* Manager assigns table
* Bill is created
* Customer submits tip
* Allocations are generated
* Manager closes shift
* Payout is recorded

### Permission Tests

Test:

* Employee cannot access manager routes
* Employee cannot view another employee’s earnings
* Public customer cannot access internal bill information
* Manager cannot modify another restaurant’s records
* Closed shift cannot be edited without authorization

### End-to-End Tests

Create one complete test scenario:

1. Create restaurant
2. Create manager
3. Create waiter
4. Create runner
5. Create table
6. Open shift
7. Assign waiter and runner
8. Create ₹2,000 bill
9. Submit ₹200 tip
10. Split the tip using a 70/30 rule
11. Verify waiter receives ₹140
12. Verify runner receives ₹60
13. Close shift
14. Record payout
15. Verify employee dashboards

---

## Seed Data

Create development seed data containing:

```text
Restaurant: Demo Restaurant
Restaurant code: DEMO
Manager: Demo Manager
Employee 1: Arjun
Employee code: W001
Employee type: WAITER
Employee 2: Priya
Employee code: R001
Employee type: RUNNER
Tables: 1 through 10
Default tip percentages: 5%, 10%, 15%
```

Use development-only credentials and document them clearly.

Never include real credentials in source control.

---

## Environment Variables

Create an `.env.example` file.

```text
DATABASE_URL=
AUTH_SECRET=
NEXT_PUBLIC_APP_URL=
```

Optional future variables:

```text
PAYMENT_PROVIDER_KEY=
PAYMENT_PROVIDER_SECRET=
SMS_PROVIDER_KEY=
EMAIL_PROVIDER_KEY=
```

---

## Project Structure

Suggested structure:

```text
src/
  app/
    api/
    employee/
    manager/
    tip/
  components/
    employee/
    manager/
    customer/
    shared/
  lib/
    auth/
    database/
    permissions/
    tips/
    currency/
    validation/
  server/
    services/
    repositories/
  types/
  tests/

prisma/
  schema.prisma
  seed.ts

public/
```

Keep tip-calculation logic separate from UI components.

Recommended modules:

```text
src/lib/tips/calculate-direct.ts
src/lib/tips/calculate-weighted.ts
src/lib/tips/calculate-equal.ts
src/lib/tips/calculate-hours-pool.ts
src/lib/tips/calculate-points-pool.ts
src/lib/tips/calculate-hybrid.ts
src/lib/tips/rounding.ts
```

---

## Development Phases

### Phase 1: Foundation

Build:

* Next.js project
* Tailwind CSS
* shadcn/ui
* PostgreSQL
* Prisma
* Authentication
* Restaurant model
* Manager account
* Employee model
* Table model

### Phase 2: Shift Operations

Build:

* Shift creation
* Shift status management
* Employee shift participation
* Table assignments
* Employee dashboard
* Manager shift dashboard

### Phase 3: Bills and Tips

Build:

* Bill creation
* Public bill tokens
* QR code generation
* Customer tipping page
* Percentage tips
* Custom tips
* Cash tips
* Tip confirmation

### Phase 4: Distribution Engine

Build:

* Direct allocation
* Weighted allocation
* Equal split
* Shared pool
* Hybrid allocation
* Accurate paise rounding
* Allocation records
* Adjustment records

### Phase 5: Shift Closing and Payouts

Build:

* Shift review
* Final allocations
* Shift closing
* Payout tracking
* Employee history
* CSV reports
* Audit logs

### Phase 6: Quality and Deployment

Complete:

* Unit tests
* Integration tests
* End-to-end tests
* Error handling
* Loading states
* Security review
* Responsive testing
* Vercel deployment
* Production database setup

---

## Initial MVP Scope

The first release should include:

* One restaurant per account
* Manager login
* Employee PIN login
* Employee creation
* Table creation
* Shift creation
* Table assignments
* Manual bill entry
* QR-based tipping page
* Percentage and custom tips
* Cash tip entry
* Weighted tip distribution
* Equal tip distribution
* Employee earnings dashboard
* Shift closing
* Payout recording
* CSV export
* Audit log

Do not include the following in the first release unless the core MVP is complete:

* Direct UPI payment processing
* POS integrations
* Payroll integrations
* Multi-location restaurant groups
* SMS notifications
* Native mobile applications
* Advanced analytics
* Full offline synchronization
* Customer accounts
* Loyalty programs
* AI recommendations

---

## Future Features

Potential future improvements:

* UPI payment collection
* Razorpay integration
* PhonePe integration
* Cashfree integration
* POS integrations
* Restaurant group management
* Multiple branches
* Payroll export
* Automatic employee payouts
* Employee attendance
* Tip forecasting
* Customer feedback analytics
* Service-performance dashboards
* Multilingual support
* Hindi support
* Regional Indian language support
* Native Android application
* Offline-first mode
* WhatsApp shift summaries
* Fraud and anomaly detection

---

## Acceptance Criteria

The MVP is complete when:

* A manager can create employees and tables.
* A manager can open a shift.
* Employees can log in using a unique code and PIN.
* Employees can see their assigned tables.
* A manager can create a bill for a table.
* A customer can open a secure tipping page using a QR code.
* A customer can select a percentage or custom tip.
* The system stores tip amounts using paise.
* The system automatically allocates the tip.
* Allocation totals always equal the original tip.
* Employees can view their own accumulated tips.
* Managers can review all allocations.
* Managers can add adjustments with reasons.
* Managers can close a shift.
* Closed shifts preserve historical calculations.
* Managers can record payouts.
* Managers can export a CSV report.
* Important financial actions appear in an audit log.
* The core workflow works on both desktop and mobile.

---

## Codex Implementation Instructions

Build this project incrementally.

For each development phase:

1. Inspect the current repository.
2. Explain the files that will be created or modified.
3. Implement one complete feature group at a time.
4. Keep financial logic separate from UI code.
5. Use strict TypeScript.
6. Avoid using `any`.
7. Validate all server inputs with Zod.
8. Use Prisma transactions for financial operations.
9. Store all money in integer paise.
10. Add tests for every tip-calculation strategy.
11. Run linting, type checking, and tests after major changes.
12. Do not remove working features while adding new ones.
13. Do not use placeholder logic for financial calculations.
14. Add clear error messages and empty states.
15. Update this README when implementation decisions change.

Start with:

```text
Phase 1: project setup, database schema, authentication, restaurant management, employee management, and table management.
```

After Phase 1 is complete, continue with shift management and table assignments.

---

## Product Summary

TipSathi is a transparent restaurant tip-management platform that automatically tracks, divides, and reports tips based on the employees and tables involved.

The primary value proposition is:

> Automatically track and divide restaurant tips without manual end-of-shift calculations.

---

## Implementation Notes

TipSathi is implemented as a full-stack Next.js App Router application with strict TypeScript, Tailwind CSS, shadcn/ui, Prisma, PostgreSQL, Zod, JWT-backed HTTP-only sessions, bcrypt password/PIN hashing, and Vitest.

### Implemented product surfaces

- Public product page and role-specific login screens
- Mobile-first manager workspace, live table floor, shift review, employees, payouts, reports, and settings
- Employee shift and private earnings dashboard
- QR-ready customer tipping route at `/tip/[publicToken]`
- Percentage, custom, and no-tip customer choices
- Manual bill and cash/manual tip APIs
- Paise-only direct, weighted, equal, hours, points, and hybrid allocation engines
- Deterministic largest-remainder allocation with exact sum invariants
- PostgreSQL schema, initial migration, development seed, audit records, and manager-scoped APIs
- Provider-agnostic POS integration system described below

## POS Integration Architecture

POS provider code lives under `src/integrations/pos` and does not import UI code. Core tip calculations do not know which provider supplied a bill.

```text
src/integrations/pos/
  adapter.ts                 shared adapter contract and safe error types
  types.ts                   normalized provider-independent records/events
  registry.ts                adapter registry and provider availability
  matching.ts                conservative employee/table matching
  sync-service.ts            mappings, bills, tips, allocations, sync runs
  webhook-service.ts         signature verification and idempotent processing
  presentation.ts            credential-safe API DTOs
  security/
    encryption.ts            AES-256-GCM credential encryption
    redaction.ts             recursive secret redaction
    safe-url.ts              SSRF and private-network protection
  providers/
    generic/                 configurable HTTPS JSON REST adapter
    mock/                    deterministic development/test adapter
    csv/                     CSV parser, preview, validation, and adapter
    manual/                  no-POS fallback adapter
```

### Provider availability

- `GENERIC_API`: available. Configurable relative endpoints, authentication, field mappings, status mappings, timeouts, response paths, and webhook mappings.
- `CSV_IMPORT`: available with row-level preview and failed-row export.
- `MANUAL`: available and remains independent from connected systems.
- `MOCK`: development only. Returns Main Outlet, W001/Arjun, R001/Priya, Table 12, bill INV-1024 for ₹2,000, and a confirmed ₹200 tip.
- `PETPOOJA`, `RESTROWORKS`, and `CUSTOM`: registered as unavailable placeholders. No undocumented endpoint or payload assumptions are included.

### Synchronization behavior

A sync:

1. Loads a restaurant-scoped integration.
2. Decrypts credentials only on the server.
3. Instantiates the registered adapter.
4. Normalizes outlets, employees, tables, and bills.
5. Matches employees only by unique employee code; names never auto-merge.
6. Matches tables by number or exact normalized name.
7. Creates pending mappings when a reliable match is unavailable.
8. Imports each bill in its own transaction so one bad record does not corrupt others.
9. Imports a tip only for a paid bill with a positive confirmed external tip.
10. Allocates imported tips with the existing paise-only engine.
11. Records mappings, a sync run, errors, and audit activity.

Unique database constraints make external bills, external tips, and webhook events idempotent. Repeated input does not create duplicate financial records or allocations.

### Generic REST security

Generic provider requests are server-only. Settings accept relative endpoint paths so requests cannot jump to another origin. The connection layer:

- permits HTTPS only in production;
- blocks localhost, private, link-local, reserved, and cloud metadata targets;
- resolves hostnames and rejects private resolved addresses;
- rejects URL-embedded credentials and redirects;
- applies a 1–30 second timeout;
- handles rejected credentials and non-2xx responses safely;
- validates response collections and mapped records with Zod;
- reads nested fields without `eval`; and
- redacts authorization, token, secret, password, signature, and API-key fields before storage or logs.

Trusted on-prem/private network access is deliberately not enabled in this version. It requires a separate allowlist design.

### Credential encryption

Set `POS_CREDENTIAL_ENCRYPTION_KEY` to a base64-encoded 32-byte value:

```bash
openssl rand -base64 32
```

Credentials are encrypted with AES-256-GCM using a fresh 96-bit IV. Saved credentials are never included in integration API responses. Changing the key makes existing saved credentials unreadable, so manage and rotate it deliberately.

### Webhooks

The public endpoint is:

```text
POST /api/integrations/pos/[integrationId]/webhook
```

Adapters verify the raw request body before normalization. The generic and mock adapters use an HMAC-SHA256 signature from `x-pos-signature` (or `x-signature`) and accept the usual `sha256=<hex>` form. Invalid signatures are rejected and audited. The unique `posIntegrationId + providerEventId` constraint prevents duplicate processing.

Webhook events normalize to the event types in the product brief. Unknown events are stored as ignored rather than treated as paid.

### CSV imports

Manager routes:

```text
/manager/integrations/csv
POST /api/integrations/csv/preview
POST /api/integrations/csv/import
```

Required columns:

```csv
bill_number,table_number,bill_total,employee_code,status
```

Optional columns:

```csv
tip_amount,paid_at,external_bill_id,employee_name,table_name
```

Rupee strings are parsed directly into integer paise. Invalid monetary values are never silently skipped: each row carries explicit errors, invalid rows remain unimported, and the manager can download them.

## Local Setup

1. Copy `.env.example` to `.env`.
2. Set a PostgreSQL `DATABASE_URL`.
3. Generate strong `AUTH_SECRET` and `POS_CREDENTIAL_ENCRYPTION_KEY` values.
4. Apply the migration and seed demo data.

```bash
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Development seed credentials:

```text
Restaurant code: DEMO
Manager email: manager@demo.in
Manager password: TipSathi123!
Employee code: W001
Employee PIN: 1234
```

These credentials are development-only and must not be used in production.

## Verification

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Unit coverage includes all allocation strategies, rounding, refunds, provider registry behavior, generic field normalization, nested mapping safety, rupee-to-paise conversion, status normalization, employee/table matching, AES-GCM encryption, secret redaction, webhook HMAC verification, and CSV row validation.

Database-backed integration and permission scenarios require a disposable PostgreSQL test database configured through `DATABASE_URL`.
