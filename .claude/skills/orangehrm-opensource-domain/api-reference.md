# OrangeHRM Open Source REST API Reference (v2)

> **Base URL**: `{host}/web/index.php/api/v2`
> **Auth**: OAuth 2.0 Bearer token (5.5+) via `Admin → Configuration → Register OAuth Client`, OR session cookie (`orangehrm`) + CSRF header (`X-CSRF-Token`) for UI-driven calls.
> **Content-Type**: `application/json` for POST/PUT, `application/x-www-form-urlencoded` accepted for some legacy endpoints.
> **Standard response envelope**: `{ "data": ... , "meta": { "total": N }, "rels": [] }`
> **Standard list query**: `?limit=50&offset=0&sortField=<field>&sortOrder=ASC|DESC`

## Authentication
| Method | Endpoint                                  | Body                                                            | Response                              |
|--------|-------------------------------------------|-----------------------------------------------------------------|---------------------------------------|
| POST   | `/web/index.php/auth/validate`            | `username, password, _token`                                    | 302 redirect (UI flow)                |
| POST   | `/oauth2/token`                           | `grant_type=password, client_id, client_secret, username, password` | `{ access_token, token_type, expires_in, refresh_token, scope }` |
| GET    | `/web/index.php/auth/logout`              | -                                                               | 302 → `/auth/login`                   |

## Admin – Users (Bearer required)
| Method | Endpoint                          | Query / Body                                                                   | Notes                                  |
|--------|-----------------------------------|--------------------------------------------------------------------------------|----------------------------------------|
| GET    | `/admin/users`                    | `?limit, offset, sortField=u.userName, sortOrder, username, userRoleId, empNumber, status` | List system users                |
| GET    | `/admin/users/{id}`               | -                                                                              |                                        |
| POST   | `/admin/users`                    | `{ username, password, userRoleId, empNumber, status }`                        | username 5–40 chars, unique           |
| PUT    | `/admin/users/{id}`               | `{ username, password?, userRoleId, empNumber, status, changePassword: bool }` | Password optional on update           |
| DELETE | `/admin/users`                    | `{ ids: [int, ...] }`                                                          | Bulk delete                            |

## Admin – Job Titles, Pay Grades, Employment Status
| Method | Endpoint                                  | Body                                            |
|--------|-------------------------------------------|-------------------------------------------------|
| GET    | `/admin/job-titles`                       | -                                               |
| POST   | `/admin/job-titles`                       | `{ title, description?, note?, specification? }`|
| PUT    | `/admin/job-titles/{id}`                  | same as POST                                    |
| DELETE | `/admin/job-titles`                       | `{ ids: [...] }`                                |
| GET    | `/admin/pay-grades`                       | -                                               |
| POST   | `/admin/pay-grades`                       | `{ name }`                                      |
| GET    | `/admin/employment-statuses`              | -                                               |
| POST   | `/admin/employment-statuses`              | `{ name }`                                      |

## PIM – Employees (Bearer required)
| Method | Endpoint                                            | Query / Body                                                                                              |
|--------|-----------------------------------------------------|-----------------------------------------------------------------------------------------------------------|
| GET    | `/pim/employees`                                    | `?limit, offset, sortField, sortOrder, nameOrId, includeEmployees=onlyCurrent|currentAndPast|onlyPast, employeeId, supervisorId, jobTitleId, empStatusId, subunitId` |
| GET    | `/pim/employees/{empNumber}`                        | -                                                                                                         |
| POST   | `/pim/employees`                                    | `{ firstName, lastName, middleName?, employeeId?, empPicture? }`                                          |
| PUT    | `/pim/employees/{empNumber}/personal-details`       | `{ firstName, middleName, lastName, employeeId, otherId?, drivingLicenseNo?, drivingLicenseExpiredDate?, gender?, maritalStatus?, nationalityId?, dateOfBirth?, "smoker": bool? }` |
| GET    | `/pim/employees/{empNumber}/job-details`            | -                                                                                                         |
| PUT    | `/pim/employees/{empNumber}/job-details`            | `{ jobTitleId, empStatusId, joinedDate, jobCategoryId?, subunitId?, locationId? }`                        |
| GET    | `/pim/employees/{empNumber}/supervisors`            | -                                                                                                         |
| POST   | `/pim/employees/{empNumber}/supervisors`            | `{ empNumber, reportingMethodId }`                                                                        |
| DELETE | `/pim/employees`                                    | `{ ids: [empNumber, ...] }`                                                                               |

## Leave (Bearer required)
| Method | Endpoint                                            | Query / Body                                                                              |
|--------|-----------------------------------------------------|-------------------------------------------------------------------------------------------|
| GET    | `/leave/leave-types`                                | `?limit, offset, sortField`                                                               |
| POST   | `/leave/leave-types`                                | `{ name, situational: bool, allocateDays: number }`                                       |
| GET    | `/leave/leave-requests`                             | `?fromDate, toDate, empNumber, leaveTypeId, statuses[], subunitId, locationId`            |
| POST   | `/leave/leave-requests`                             | `{ empNumber, leaveTypeId, fromDate, toDate, comment?, duration?: { type, fromTime?, toTime? }, partialOption? }` |
| PUT    | `/leave/leave-requests/{id}`                        | `{ action: "APPROVE" | "REJECT" | "CANCEL" }`                                             |
| GET    | `/leave/leaves/{id}`                                | -                                                                                          |
| GET    | `/leave/leave-balance/{leaveTypeId}`                | `?empNumber, fromDate?, toDate?`                                                          |
| POST   | `/leave/leave-entitlements`                         | `{ empNumber, leaveTypeId, entitlement, fromDate, toDate }`                               |
| POST   | `/leave/leave-entitlements/bulk-assign`             | `{ leaveTypeId, entitlement, fromDate, toDate, locationId?, subunitId? }`                 |
| GET    | `/leave/holidays`                                   | `?fromDate, toDate`                                                                       |
| POST   | `/leave/holidays`                                   | `{ name, date, recurring: bool, length: "FULL_DAY"|"HALF_DAY" }`                          |

## Time – Timesheets & Attendance
| Method | Endpoint                                            | Body / Query                                                                       |
|--------|-----------------------------------------------------|------------------------------------------------------------------------------------|
| GET    | `/time/employees/{empNumber}/timesheets`            | `?fromDate, toDate, limit, offset`                                                 |
| POST   | `/time/employees/{empNumber}/timesheets`            | `{ date }` (week containing this date is created)                                  |
| GET    | `/time/employees/{empNumber}/timesheets/{tsId}`     | -                                                                                  |
| PUT    | `/time/employees/{empNumber}/timesheets/{tsId}/entries` | `{ entries: [{ projectId, activityId, dates: { "YYYY-MM-DD": { duration: "HH:mm" } } }] }` |
| PUT    | `/time/employees/{empNumber}/timesheets/{tsId}`     | `{ action: "SUBMIT" | "APPROVE" | "REJECT", comment? }`                            |
| GET    | `/attendance/records`                               | `?empNumber, date`                                                                 |
| POST   | `/attendance/records`                               | `{ date, time, timezoneOffset, note? }`  (Punch In)                                |
| PUT    | `/attendance/records/{id}`                          | `{ date, time, timezoneOffset, note? }`  (Punch Out)                               |

## Recruitment – Vacancies & Candidates
| Method | Endpoint                                            | Body / Query                                                                                                 |
|--------|-----------------------------------------------------|--------------------------------------------------------------------------------------------------------------|
| GET    | `/recruitment/vacancies`                            | `?limit, offset, sortField=vacancy.name, name, jobTitleId, hiringManagerId, status`                          |
| POST   | `/recruitment/vacancies`                            | `{ name, jobTitleId, hiringManagerId, numOfPositions, description?, isPublished: bool, status: bool }`       |
| PUT    | `/recruitment/vacancies/{id}`                       | same as POST                                                                                                  |
| DELETE | `/recruitment/vacancies`                            | `{ ids: [...] }`                                                                                              |
| GET    | `/recruitment/candidates`                           | `?vacancyId, status, candidateName, hiringManagerId, keywords, methodOfApplication, fromDate, toDate`        |
| POST   | `/recruitment/candidates`                           | `{ firstName, middleName?, lastName, email, contactNumber?, dateOfApplication, vacancyId, keywords?, comment?, consentToKeepData: bool }` |
| PUT    | `/recruitment/candidates/{id}`                      | same shape as POST                                                                                            |
| PUT    | `/recruitment/candidates/{id}/actions`              | `{ action: "SHORTLIST" | "REJECT" | "SCHEDULE_INTERVIEW" | "MARK_INTERVIEW_PASSED" | "MARK_INTERVIEW_FAILED" | "OFFER_JOB" | "DECLINE_OFFER" | "HIRE", note? }` |

## Performance
| Method | Endpoint                                            | Body                                                                                                  |
|--------|-----------------------------------------------------|-------------------------------------------------------------------------------------------------------|
| GET    | `/performance/reviews`                              | `?empNumber, jobTitleId, subunitId, reviewerEmpNumber, includeEmployees, statusIds[]`                 |
| POST   | `/performance/reviews`                              | `{ empNumber, supervisorReviewerEmpNumber, reviewPeriodStart, reviewPeriodEnd, dueDate? }`            |
| PUT    | `/performance/reviews/{id}`                         | activate / save-progress / complete payloads                                                          |
| GET    | `/performance/kpis`                                 | `?jobTitleId`                                                                                          |
| POST   | `/performance/kpis`                                 | `{ title, jobTitleId, minRating, maxRating, isDefault: bool }`                                        |
| GET    | `/performance/trackers`                             | `?empNumber, includeEmployees`                                                                         |

## My Info (ESS self-service — empNumber is implicit from token)
- The My Info screens reuse the PIM endpoints above, but a regular ESS user can only call them with their own `empNumber`. Calling with a different one returns `403 Forbidden`.

## Dashboard
| Method | Endpoint                                          | Notes                                       |
|--------|---------------------------------------------------|---------------------------------------------|
| GET    | `/dashboard/employees/action-summary`             | Pending leave / timesheet / candidate counts|
| GET    | `/dashboard/employees/subunit`                    | Subunit distribution chart                  |
| GET    | `/dashboard/employees/locations`                  | Location distribution chart                 |
| GET    | `/dashboard/employees/birthdays`                  | Today's birthdays widget                    |
| GET    | `/leave/leaves/leave-list`                        | "Time at Work" widget                       |

## Error Scenarios
| Scenario                                              | HTTP | Body / Toast Message                                              |
|-------------------------------------------------------|------|-------------------------------------------------------------------|
| Wrong username or wrong password                      | 200* | Page re-renders with `Invalid credentials` banner (UI flow)       |
| Missing / expired Bearer token                        | 401  | `{ "error": { "status": "401", "text": "Unauthorized" } }`        |
| CSRF token missing or invalid (UI/cookie flow)        | 401  | `{ "error": { "status": "401", "text": "Invalid CSRF token" } }`  |
| Cross-user attempt (ESS reading another empNumber)    | 403  | `{ "error": { "status": "403", "text": "Unauthorized" } }`        |
| Resource not found                                    | 404  | `{ "error": { "status": "404", "text": "Record Not Found" } }`    |
| Validation error (missing required field)             | 422  | `{ "error": { "status": "422", "text": "Invalid Parameter" }, "data": { "<field>": "Required" } }` |
| Duplicate unique field (e.g., username, employeeId)   | 422  | `data: { "<field>": "Already exists" }`                            |
| Leave balance exceeded                                | 422  | `"Leave balance exceeded"` toast / 422 body                       |
| Overlapping leave dates                               | 422  | `"Overlapping leave requests found"`                              |
| FK still in use (delete job title with employees)     | 422  | `"This record is in use and cannot be deleted"`                   |
| Trying to delete on the public demo                   | 403  | Demo restriction — DELETE is blocked silently for most endpoints  |

*OrangeHRM's web login is a form POST that returns 200 + an error banner rather than 401, since it's a server-rendered redirect flow. The `/oauth2/token` endpoint, in contrast, returns proper `401 invalid_grant`.
