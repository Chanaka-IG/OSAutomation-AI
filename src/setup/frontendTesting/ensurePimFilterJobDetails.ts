import type { OrangehrmAdminApi } from '../../api/orangehrmOSAPI/OrangehrmAdminApi';
import { EmployeesApi } from '../../api/orangehrmOSAPI/EmployeesApi';
import { EmploymentStatusesApi } from '../../api/orangehrmOSAPI/EmploymentStatusesApi';
import { JobTitlesApi } from '../../api/orangehrmOSAPI/JobTitlesApi';
import { SubunitsApi } from '../../api/orangehrmOSAPI/SubunitsApi';
import { filterTestJobDetails } from '../../../test-data/pim/frontend-api/employees';
import { createLogger } from '../../lib/logger';

const log = createLogger('ensurePimFilterJobDetails');

/** OrangeHRM "Direct" reporting method id. */
const DIRECT_REPORTING_METHOD_ID = 1;

/**
 * Assigns job title, employment status, sub unit, and supervisor to filter test employees.
 * Called after `ensureEmployeeRecords` so the employees already exist and the admin session is live.
 */
export async function ensurePimFilterJobDetails(adminApi: OrangehrmAdminApi): Promise<void> {
  const employeesApi = new EmployeesApi(adminApi.request);
  const jobTitlesApi = new JobTitlesApi(adminApi.request);
  const employmentStatusesApi = new EmploymentStatusesApi(adminApi.request);
  const subunitsApi = new SubunitsApi(adminApi.request);

  for (const detail of filterTestJobDetails) {
    const empNumber = await employeesApi.getEmpNumberByEmployeeId(detail.employeeId);
    if (empNumber === undefined) {
      log.warn(`Employee not found for employeeId=${detail.employeeId}, skipping job details`);
      continue;
    }

    const jobDetails: {
      jobTitleId?: number;
      empStatusId?: number;
      subunitId?: number;
    } = {};

    if (detail.jobTitleName !== undefined) {
      const id = await jobTitlesApi.getIdByTitle(detail.jobTitleName);
      if (id !== undefined) {
        jobDetails.jobTitleId = id;
      } else {
        log.warn(`Job title not found: "${detail.jobTitleName}" — skipping for empNumber=${empNumber}`);
      }
    }

    if (detail.employmentStatusName !== undefined) {
      const id = await employmentStatusesApi.getIdByName(detail.employmentStatusName);
      if (id !== undefined) {
        jobDetails.empStatusId = id;
      } else {
        log.warn(`Employment status not found: "${detail.employmentStatusName}" — skipping for empNumber=${empNumber}`);
      }
    }

    if (detail.subUnitName !== undefined) {
      const id = await subunitsApi.getIdByName(detail.subUnitName);
      if (id !== undefined) {
        jobDetails.subunitId = id;
      } else {
        log.warn(`Sub unit not found: "${detail.subUnitName}" — skipping for empNumber=${empNumber}`);
      }
    }

    await employeesApi.updateJobDetails(empNumber, jobDetails);

    if (detail.supervisorEmployeeId !== undefined) {
      const supervisorEmpNumber = await employeesApi.getEmpNumberByEmployeeId(
        detail.supervisorEmployeeId,
      );
      if (supervisorEmpNumber !== undefined) {
        await employeesApi.addSupervisorIfAbsent(empNumber, supervisorEmpNumber, DIRECT_REPORTING_METHOD_ID);
      } else {
        log.warn(`Supervisor not found for employeeId=${detail.supervisorEmployeeId}`);
      }
    }
  }
}
