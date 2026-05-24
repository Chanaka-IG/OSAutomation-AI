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

import { auth } from './auth';
import { addEmployee } from './pim/frontend/add-employee';
import { pim } from './pim/frontend/pim';
import { leave } from './leave/frontend/leave';
import { recruitment } from './recruitment/frontend/recruitment';

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
};

/** UI routes, URL patterns, and form sample values, grouped by module. */
export const frontend = {
  auth,
  addEmployee,
  pim,
  leave,
  recruitment,
};

/** API payloads owned by frontend/UI tests (not master-data seeding). */
export const frontendApi = {
  pim: pimFrontendApi,
};
