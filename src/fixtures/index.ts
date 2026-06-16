import type { APIRequestContext } from '@playwright/test';
import { test as base } from '@playwright/test';
import { env } from '../config/env';
import { OrangehrmAdminApi } from '../api/orangehrmOSAPI/OrangehrmAdminApi';
import type { MasterDataStatus } from '../setup/masterDataVerification';
import {
  readMasterDataStatus,
  verifyMasterData,
  writeMasterDataStatus,
} from '../setup/masterDataVerification';
import { LoginPage } from '../pages/auth/LoginPage';
import { LeaveModulePage } from '../pages/leave/LeaveModulePage';
import { LeaveEntitlementsPage } from '../pages/leave/LeaveEntitlementsPage';
import { LeaveEntitlementListPage } from '../pages/leave/LeaveEntitlementListPage';
import { AssignLeavePage } from '../pages/leave/AssignLeavePage';
import { LeaveListPage } from '../pages/leave/LeaveListPage';
import { MyLeavePage } from '../pages/leave/MyLeavePage';
import { LeaveBalanceReportPage } from '../pages/leave/LeaveBalanceReportPage';
import { ApplyLeavePage } from '../pages/leave/ApplyLeavePage';
import { AddEmployeePage } from '../pages/pim/AddEmployeePage';
import { EmployeeListPage } from '../pages/pim/EmployeeListPage';
import { PersonalDetailsPage } from '../pages/pim/PersonalDetailsPage';
import { OptionalFieldsPage } from '../pages/pim/OptionalFieldsPage';
import { CustomFieldsPage } from '../pages/pim/CustomFieldsPage';
import { ReportingMethodsPage } from '../pages/pim/ReportingMethodsPage';
import { ReportToPage } from '../pages/pim/ReportToPage';
import { PimModulePage } from '../pages/pim/PimModulePage';
import { PimReportsPage } from '../pages/pim/PimReportsPage';
import { RecruitmentModulePage } from '../pages/recruitment/RecruitmentModulePage';
import { AddVacancyPage } from '../pages/recruitment/AddVacancyPage';
import { AddCandidatePage } from '../pages/recruitment/AddCandidatePage';
import { CandidatesListPage } from '../pages/recruitment/CandidatesListPage';
import { CandidateProfilePage } from '../pages/recruitment/CandidateProfilePage';
import { VacanciesListPage } from '../pages/recruitment/VacanciesListPage';
import { AddKpisPage } from '../pages/performance/AddKpisPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { JobTitlesPage } from '../pages/admin/JobTitlesPage';
import { PayGradesPage } from '../pages/admin/PayGradesPage';
import { EmploymentStatusPage } from '../pages/admin/EmploymentStatusPage';
import { OrganizationStructurePage } from '../pages/admin/OrganizationStructurePage';
import { SystemUsersPage } from '../pages/admin/SystemUsersPage';
import { WorkShiftsPage } from '../pages/admin/WorkShiftsPage';
import { DirectoryPage } from '../pages/directory/DirectoryPage';
import { MyTrackersPage } from '../pages/performance/MyTrackersPage'
import { PunchPage } from '../pages/time/PunchPage';
import { MyAttendanceRecordsPage } from '../pages/time/MyAttendanceRecordsPage';
import { EmployeeAttendanceRecordsPage } from '../pages/time/EmployeeAttendanceRecordsPage';
import { AttendanceConfigPage } from '../pages/time/AttendanceConfigPage';
import { ProjectsPage } from '../pages/time/ProjectsPage';
import { MyTimesheetPage } from '../pages/time/MyTimesheetPage';
import { EmployeeTimesheetPage } from '../pages/time/EmployeeTimesheetPage';


/** Custom fixtures (must not be named `Fixtures` — clashes with Playwright's `Fixtures<>` generic). */
export type OrangehrmFixtures = {
  loginPage: LoginPage;
  assignLeavePage: AssignLeavePage;
  applyLeavePage: ApplyLeavePage;
  leaveListPage: LeaveListPage;
  myLeavePage: MyLeavePage;
  leaveBalanceReportPage: LeaveBalanceReportPage;
  addEmployeePage: AddEmployeePage;
  pimModulePage: PimModulePage;
  pimReportsPage: PimReportsPage;
  employeeListPage: EmployeeListPage;
  personalDetailsPage: PersonalDetailsPage;
  optionalFieldsPage: OptionalFieldsPage;
  customFieldsPage: CustomFieldsPage;
  reportingMethodsPage: ReportingMethodsPage;
  reportToPage: ReportToPage;
  leaveModulePage: LeaveModulePage;
  leaveEntitlementsPage: LeaveEntitlementsPage;
  leaveEntitlementListPage: LeaveEntitlementListPage;
  recruitmentModulePage: RecruitmentModulePage;
  addVacancyPage: AddVacancyPage;
  addCandidatePage: AddCandidatePage;
  candidatesListPage: CandidatesListPage;
  candidateProfilePage: CandidateProfilePage;
  vacanciesListPage: VacanciesListPage;
  addKpisPage: AddKpisPage;
  dashboardPage: DashboardPage;
  jobTitlesPage: JobTitlesPage;
  payGradesPage: PayGradesPage;
  employmentStatusPage: EmploymentStatusPage;
  organizationStructurePage: OrganizationStructurePage;
  systemUsersPage: SystemUsersPage;
  workShiftsPage: WorkShiftsPage;
  directoryPage: DirectoryPage;
  myTrackersPage: MyTrackersPage;
  punchPage: PunchPage;
  myAttendanceRecordsPage: MyAttendanceRecordsPage;
  employeeAttendanceRecordsPage: EmployeeAttendanceRecordsPage;
  attendanceConfigPage: AttendanceConfigPage;
  projectsPage: ProjectsPage;
  myTimesheetPage: MyTimesheetPage;
  employeeTimesheetPage: EmployeeTimesheetPage;
  /** OrangeHRM host + browser-like Accept headers; use with {@link orangehrmAdminApi}. */
  orangehrmApiContext: APIRequestContext;
  orangehrmAdminApi: OrangehrmAdminApi;
};

/** Worker-scoped fixtures (second generic to `base.extend`). */
export type OrangehrmWorkerFixtures = {
  /**
   * Last verification result (reads `test-results/master-data-status.json` when present).
   * Reference `{ masterDataReadiness }` in `beforeEach` so tests fail fast when seed data is missing.
   */
  masterDataReadiness: MasterDataStatus;
};

export const test = base.extend<OrangehrmFixtures, OrangehrmWorkerFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  assignLeavePage: async ({ page }, use) => {
    await use(new AssignLeavePage(page));
  },

  leaveListPage: async ({ page }, use) => {
    await use(new LeaveListPage(page));
  },

  myLeavePage: async ({ page }, use) => {
    await use(new MyLeavePage(page));
  },

  leaveBalanceReportPage: async ({ page }, use) => {
    await use(new LeaveBalanceReportPage(page));
  },

  applyLeavePage: async ({ page }, use) => {
    await use(new ApplyLeavePage(page));
  },

  addEmployeePage: async ({ page }, use) => {
    await use(new AddEmployeePage(page));
  },

  pimModulePage: async ({ page }, use) => {
    await use(new PimModulePage(page));
  },

  pimReportsPage: async ({ page }, use) => {
    await use(new PimReportsPage(page));
  },

  employeeListPage: async ({ page }, use) => {
    await use(new EmployeeListPage(page));
  },

  personalDetailsPage: async ({ page }, use) => {
    await use(new PersonalDetailsPage(page));
  },

  optionalFieldsPage: async ({ page }, use) => {
    await use(new OptionalFieldsPage(page));
  },

  customFieldsPage: async ({ page }, use) => {
    await use(new CustomFieldsPage(page));
  },

  reportingMethodsPage: async ({ page }, use) => {
    await use(new ReportingMethodsPage(page));
  },

  reportToPage: async ({ page }, use) => {
    await use(new ReportToPage(page));
  },

  leaveModulePage: async ({ page }, use) => {
    await use(new LeaveModulePage(page));
  },

  leaveEntitlementsPage: async ({ page }, use) => {
    await use(new LeaveEntitlementsPage(page));
  },

  leaveEntitlementListPage: async ({ page }, use) => {
    await use(new LeaveEntitlementListPage(page));
  },

  recruitmentModulePage: async ({ page }, use) => {
    await use(new RecruitmentModulePage(page));
  },

  addVacancyPage: async ({ page }, use) => {
    await use(new AddVacancyPage(page));
  },

  addCandidatePage: async ({ page }, use) => {
    await use(new AddCandidatePage(page));
  },

  candidatesListPage: async ({ page }, use) => {
    await use(new CandidatesListPage(page));
  },

  candidateProfilePage: async ({ page }, use) => {
    await use(new CandidateProfilePage(page));
  },

  vacanciesListPage: async ({ page }, use) => {
    await use(new VacanciesListPage(page));
  },

  addKpisPage: async ({ page }, use) => {
    await use(new AddKpisPage(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  jobTitlesPage: async ({ page }, use) => {
    await use(new JobTitlesPage(page));
  },

  payGradesPage: async ({ page }, use) => {
    await use(new PayGradesPage(page));
  },

  employmentStatusPage: async ({ page }, use) => {
    await use(new EmploymentStatusPage(page));
  },

  organizationStructurePage: async ({ page }, use) => {
    await use(new OrganizationStructurePage(page));
  },

  systemUsersPage: async ({ page }, use) => {
    await use(new SystemUsersPage(page));
  },

  workShiftsPage: async ({ page }, use) => {
    await use(new WorkShiftsPage(page));
  },

  directoryPage: async ({ page }, use) => {
    await use(new DirectoryPage(page));
  },

  myTrackersPage: async ({ page }, use) => {
    await use(new MyTrackersPage(page));
  },

  punchPage: async ({ page }, use) => {
    await use(new PunchPage(page));
  },

  myAttendanceRecordsPage: async ({ page }, use) => {
    await use(new MyAttendanceRecordsPage(page));
  },

  employeeAttendanceRecordsPage: async ({ page }, use) => {
    await use(new EmployeeAttendanceRecordsPage(page));
  },

  attendanceConfigPage: async ({ page }, use) => {
    await use(new AttendanceConfigPage(page));
  },

  projectsPage: async ({ page }, use) => {
    await use(new ProjectsPage(page));
  },

  myTimesheetPage: async ({ page }, use) => {
    await use(new MyTimesheetPage(page));
  },

  employeeTimesheetPage: async ({ page }, use) => {
    await use(new EmployeeTimesheetPage(page));
  },

  orangehrmApiContext: async ({ playwright }, use) => {
    const context = await playwright.request.newContext({
      baseURL: env.baseURL || undefined,
      extraHTTPHeaders: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    await use(context);
    await context.dispose();
  },

  orangehrmAdminApi: async ({ orangehrmApiContext }, use) => {
    await use(new OrangehrmAdminApi(orangehrmApiContext));
  },

  masterDataReadiness: [
    async ({ playwright }, use) => {
      if (process.env.SKIP_MASTER_DATA_CHECK === '1') {
        await use({
          ok: true,
          missing: [],
          checkedAt: new Date().toISOString(),
          skipped: true,
        });
        return;
      }

      const cached = readMasterDataStatus();
      if (cached && (cached.ok || cached.skipped)) {
        await use(cached);
        return;
      }

      if (!env.baseURL) {
        await use({
          ok: true,
          missing: [],
          checkedAt: new Date().toISOString(),
          skipped: true,
        });
        return;
      }

      const ctx = await playwright.request.newContext({
        baseURL: env.baseURL,
        extraHTTPHeaders: {
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      try {
        const adminApi = new OrangehrmAdminApi(ctx);
        const status = await verifyMasterData(adminApi);
        writeMasterDataStatus(status);
        if (!status.ok) {
          throw new Error(
            `Master data incomplete: ${status.missing.join('; ')}\n` +
            `Run: npx playwright test --project=master-data tests/setup/seed-master-data.spec.ts`,
          );
        }
        await use(status);
      } finally {
        await ctx.dispose();
      }
    },
    { scope: 'worker', timeout: 120_000 },
  ],
});

export { expect } from '@playwright/test';
export type { MasterDataStatus } from '../setup/masterDataVerification';
