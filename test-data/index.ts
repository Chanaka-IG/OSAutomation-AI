/**
 * Central test data — organised by module.
 *
 * Consumers that import via barrel (`{ api }`, `{ frontend }`, `{ frontendApi }`) continue to work unchanged.
 * For direct imports, use the module path: `test-data/pim/api/employees`, `test-data/leave/frontend/leave`, etc.
 */

import { adminUsers } from './pim/api/adminUsers';
import { employees } from './pim/api/employees';
import { employmentStatuses } from './pim/api/employmentStatuses';
import { jobTitles } from './pim/api/jobTitles';
import { locations } from './pim/api/locations';
import { payGrades } from './pim/api/payGrades';
import { subunits } from './pim/api/subunits';
import { holidays } from './leave/api/holidays';
import { leavePeriod } from './leave/api/leavePeriod';
import { leaveTypes } from './leave/api/leaveTypes';
import { workweek } from './time/api/workweek';
import { skills } from './pim/api/skills';
import { workShifts } from './admin/api/workShifts';
import { optionalFields } from './pim/api/optionalFields';
import { customFields } from './pim/api/customFields';
import { reportingMethods } from './pim/api/reportingMethods';
import  { trackers } from './performance/api/myTrackers'
import { events as claimEvents } from './claim/api/events';
import { expenseTypes as claimExpenseTypes } from './claim/api/expenseTypes';
import { claimRequests } from './claim/api/claimRequests';

import { auth } from './auth';
import { addEmployee } from './pim/frontend/add-employee';
import { pim } from './pim/frontend/pim';
import { leave } from './leave/frontend/leave';
import { recruitment } from './recruitment/frontend/recruitment';
import { performance } from './performance/frontend/performance';
import { adminJobTitles } from './admin/frontend/jobTitles';
import { adminPayGrades } from './admin/frontend/payGrades';
import { adminEmploymentStatus } from './admin/frontend/employmentStatus';
import { adminOrganizationStructure } from './admin/frontend/organizationStructure';
import { adminSystemUsers } from './admin/frontend/systemUsers';
import { adminWorkShifts } from './admin/frontend/workShifts';
import { directory } from './directory/frontend/directory';
import { attendance } from './time/frontend/attendance';
import { projects as timeProjects } from './time/frontend/projects';
import { timesheets as timeTimesheets } from './time/frontend/timesheets';
import { employeeTimesheets as timeEmployeeTimesheets } from './time/frontend/employeeTimesheets';
import { timesheetLifecycle as timeTimesheetLifecycle } from './time/frontend/timesheetLifecycle';
import  { myTrackers } from './performance/frontend/myTrackers'
import { claimEvents as claimEventsFrontend } from './claim/frontend/events';
import { claimExpenseTypes as claimExpenseTypesFrontend } from './claim/frontend/expenseTypes';
import { submitClaim as submitClaimFrontend } from './claim/frontend/submitClaim';
import { assignClaim as assignClaimFrontend } from './claim/frontend/assignClaim';
import { employeeClaims as employeeClaimsFrontend } from './claim/frontend/employeeClaims';
import { optionalFields as optionalFieldsFrontend } from './pim/frontend/optionalFields';
import { customFields as customFieldsFrontend } from './pim/frontend/customFields';
import { reportingMethods as reportingMethodsFrontend } from './pim/frontend/reportingMethods';

import * as pimFrontendApi from './pim/frontend-api';

/** Master-data seed configs, grouped by module internally. */
export const api = {
  adminUsers,
  employees,
  employmentStatuses,
  jobTitles,
  locations,
  payGrades,
  subunits,
  holidays,
  leavePeriod,
  leaveTypes,
  workweek,
  skills,
  workShifts,
  optionalFields,
  customFields,
  reportingMethods,
  trackers,
  claimEvents,
  claimExpenseTypes,
  claimRequests
};

/** UI routes, URL patterns, and form sample values, grouped by module. */
export const frontend = {
  auth,
  addEmployee,
  pim,
  leave,
  recruitment,
  performance,
  adminJobTitles,
  adminPayGrades,
  adminEmploymentStatus,
  adminOrganizationStructure,
  adminSystemUsers,
  adminWorkShifts,
  optionalFields: optionalFieldsFrontend,
  customFields: customFieldsFrontend,
  reportingMethods: reportingMethodsFrontend,
  directory,
  myTrackers,
  claimEvents: claimEventsFrontend,
  claimExpenseTypes: claimExpenseTypesFrontend,
  submitClaim: submitClaimFrontend,
  assignClaim: assignClaimFrontend,
  employeeClaims: employeeClaimsFrontend,
  attendance,
  projects: timeProjects,
  timesheets: timeTimesheets,
  employeeTimesheets: timeEmployeeTimesheets,
  timesheetLifecycle: timeTimesheetLifecycle,
};

/** API payloads owned by frontend/UI tests (not master-data seeding). */
export const frontendApi = {
  pim: pimFrontendApi,
};
