---
name: orangehrm-opensource-domain
description: OrangeHRM Open Source (Starter) application domain knowledge — business rules, REST API endpoints, data models, user flows, UI selectors, and error scenarios for UI automation. Use when writing Selenium/Playwright/Cypress tests, reviewing automation code, creating test scenarios, or answering questions about how OrangeHRM Open Source works.
user-invocable: false
---

# OrangeHRM Open Source Domain Knowledge

## Overview
OrangeHRM Open Source (Starter) is a free, GPL-licensed Human Resource Management System (HRMS) for small and medium-sized companies. It supports the full HR lifecycle: employee data, leave, time tracking, recruitment, performance reviews, and administration. Users operate under one of three role types — **Admin**, **ESS (Employee Self Service)**, or **Supervisor** — and what they can see or do is governed by data-group permissions configured per role.

Public demo: `https://opensource-demo.orangehrmlive.com` (Admin / admin123) — resets nightly.

## Tech Stack
- **Frontend**: Vue.js 3 (Composition API), Vue Router, Vuex, OXD design system (`@orangehrm/oxd`)
- **Backend**: PHP 8.1+ on Symfony 6 components, Doctrine ORM, custom OrangeHRM framework
- **Database**: MySQL 8+ / MariaDB 10.6+
- **Auth (Web)**: PHP session cookie (`orangehrm` cookie) + CSRF token (`_token`)
- **Auth (REST API v2)**: OAuth 2.0 Bearer token (5.5+) OR session cookie + CSRF token (for UI-driven calls)
- **API Base**: `/web/index.php/api/v2/<module>/<resource>`
- **Testing target**: Playwright recommended (Chromium); Selenium/Cypress also supported. The OXD form components require careful selector strategy (see `ui-selectors.md`).

## Architecture
```
OrangeHRM Open Source (Monorepo)
src/
├── client/                          # Vue.js frontend (compiled to /web)
│   ├── src/
│   │   ├── components/              # OXD wrappers + composables
│   │   ├── orangehrmAdminPlugin/    # Admin module Vue views
│   │   ├── orangehrmPimPlugin/      # PIM module Vue views
│   │   ├── orangehrmLeavePlugin/    # Leave module Vue views
│   │   ├── orangehrmTimePlugin/     # Time module Vue views
│   │   ├── orangehrmRecruitmentPlugin/
│   │   ├── orangehrmPerformancePlugin/
│   │   ├── orangehrmDashboardPlugin/
│   │   └── orangehrmMyInfoPlugin/
│   └── public/
└── plugins/                         # PHP backend plugins
    ├── orangehrmCorePlugin/         # Framework, CRUD endpoint base classes
    ├── orangehrmAdminPlugin/
    │   ├── Api/                     # REST API endpoints (Endpoint, CrudEndpoint)
    │   ├── Service/                 # Business logic
    │   ├── Dao/                     # Doctrine repositories
    │   └── config/routes.yaml       # API route definitions
    ├── orangehrmPimPlugin/
    ├── orangehrmLeavePlugin/
    ├── orangehrmTimePlugin/
    ├── orangehrmRecruitmentPlugin/
    ├── orangehrmPerformancePlugin/
    ├── orangehrmDashboardPlugin/
    ├── orangehrmAttendancePlugin/
    └── orangehrmAuthenticationPlugin/

URL pattern:  /web/index.php/<module>/<viewAction>          (UI pages)
API pattern:  /web/index.php/api/v2/<module>/<resource>     (REST API)
```

## Modules Covered
| Module        | URL Prefix              | Primary Purpose                                    |
|---------------|-------------------------|----------------------------------------------------|
| Dashboard     | `/dashboard/index`      | Landing page, widgets, quick launchers            |
| Admin         | `/admin/viewSystemUsers`| Users, job, organization, qualifications, config  |
| PIM           | `/pim/viewEmployeeList` | Employee master data, personal/job/report-to      |
| Leave         | `/leave/viewLeaveList`  | Apply, approve, assign, configure leave types     |
| Time          | `/time/viewEmployeeTimesheet` | Timesheets, attendance records              |
| Recruitment   | `/recruitment/viewCandidates` | Vacancies and candidate pipeline             |
| Performance   | `/performance/searchEvaluatePerformanceReview` | KPIs, reviews, trackers     |
| My Info       | `/pim/viewPersonalDetails/empNumber/<self>` | Logged-in user's own PIM record |

## Core Data Models

### User (System User)
| Field         | Type        | Notes                                       |
|---------------|-------------|---------------------------------------------|
| userId        | Int (PK)    | Auto-increment                              |
| userName      | String(40)  | Unique, required, min 5 chars              |
| password      | String      | bcrypt hashed                               |
| userRoleId    | Int (FK)    | 1 = Admin, 2 = ESS                          |
| empNumber     | Int (FK)    | Linked Employee (mandatory)                 |
| status        | Boolean     | true = Enabled, false = Disabled            |
| dateEntered   | DateTime    |                                             |
| createdBy     | Int (FK)    | userId of creator                           |

### Employee
| Field           | Type       | Notes                                          |
|-----------------|------------|------------------------------------------------|
| empNumber       | Int (PK)   | Auto-increment, primary key for almost all FKs |
| employeeId      | String(50) | Human-readable ID, auto-generated if blank     |
| firstName       | String(30) | Required                                       |
| middleName      | String(30) | Optional                                       |
| lastName        | String(30) | Required                                       |
| jobTitleId      | Int (FK)   | Nullable                                       |
| empStatusId     | Int (FK)   | Full-time / Part-time / Freelance              |
| subDivisionId   | Int (FK)   | Sub Unit (organization tree)                   |
| supervisorId    | Int (FK)   | Reports-to chain                               |
| workEmail       | String     | Must be unique across the system               |
| terminationId   | Int (FK)   | Nullable — set when terminated                 |
| purgedAt        | DateTime   | Nullable — set when data is purged             |

### Leave Request / Leave
| Field         | Type        | Notes                                       |
|---------------|-------------|---------------------------------------------|
| id            | Int (PK)    | Auto-increment                              |
| empNumber     | Int (FK)    | Requesting employee                         |
| leaveTypeId   | Int (FK)    | Annual, Sick, Casual, etc.                  |
| fromDate      | Date        | Required                                    |
| toDate        | Date        | Required, >= fromDate                       |
| status        | Int         | -1 Rejected, 0 Cancelled, 1 Pending Approval, 2 Scheduled, 3 Taken |
| comment       | Text        | Optional                                    |
| numberOfDays  | Decimal     | Computed; respects work week + holidays     |

### Job Vacancy / Candidate
| Field           | Type        | Notes                                       |
|-----------------|-------------|---------------------------------------------|
| vacancyId       | Int (PK)    | Auto-increment                              |
| name            | String      | Required, unique                            |
| jobTitleId      | Int (FK)    | Required                                    |
| hiringManagerId | Int (FK)    | Required (Employee)                         |
| numOfPositions  | Int         | >= 1                                        |
| status          | Boolean     | Active / Closed                             |
| isPublished     | Boolean     | Visible on public job site                  |
| candidateId     | Int (PK)    | (Candidate table)                           |
| status (cand.)  | Enum        | APPLICATION_INITIATED, SHORTLISTED, INTERVIEW_SCHEDULED, INTERVIEW_PASSED, INTERVIEW_FAILED, JOB_OFFERED, OFFER_DECLINED, HIRED, REJECTED |

### Timesheet
| Field         | Type        | Notes                                       |
|---------------|-------------|---------------------------------------------|
| timesheetId   | Int (PK)    | One per week per employee                   |
| empNumber     | Int (FK)    |                                             |
| startDate     | Date        | Monday of the week (depends on config)      |
| endDate       | Date        | Sunday of the week                          |
| state         | String      | NOT_SUBMITTED, SUBMITTED, APPROVED, REJECTED |

## Detailed Knowledge (Sub-Files)

Load these based on what the current task needs:

- **Business rules & validation logic** → read `./business-rules.md`
- **REST API endpoints & error codes** → read `./api-reference.md`
- **UI selectors for test automation (OXD-aware)** → read `./ui-selectors.md`
- **User flows, role-based scenarios & test data** → read `./user-flows.md`
