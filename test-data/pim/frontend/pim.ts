import { filterTestJobDetails, primaryFilterEmployee, secondaryFilterEmployee } from '../frontend-api/employees';

/** UI strings, routes, and form values for PIM module tests. */

export const pim = {
  routes: {
    employeeList: '/web/index.php/pim/viewEmployeeList',
    addEmployee: '/web/index.php/pim/addEmployee',
  },
  urlPatterns: {
    employeeList: /viewEmployeeList/i,
    addEmployee: /addEmployee/i,
  },
  samples: {
    /** Aligned with {@link ../frontend-api/employees} `ensurePimFilterEmployees` seeds. */
    employeeFirstName: primaryFilterEmployee.firstName,
    employeeLastName: primaryFilterEmployee.lastName,
    seededEmployeeName: primaryFilterEmployee.firstName,
    seededEmployeeId: primaryFilterEmployee.employeeId,
    /**
     * Job detail filter samples — aligned with `filterTestJobDetails` (TC-PIM-EL-008–011/013).
     * Olivia Nguyen (061001): QA Engineer / Permanent / Engineering.
     * Samuel Okonkwo (061003): supervised by Olivia.
     */
    seededJobTitle: filterTestJobDetails[0].jobTitleName as string,
    seededEmploymentStatus: filterTestJobDetails[0].employmentStatusName as string,
    seededSubUnit: filterTestJobDetails[0].subUnitName as string,
    /** Full "First (& Middle) Name" column value for the primary filter employee (TC-PIM-EL-012). */
    seededFirstMiddleName: `${primaryFilterEmployee.firstName} ${primaryFilterEmployee.middleName}`,
    /** First name to type into Supervisor Name autocomplete (resolves to Olivia Nguyen). */
    seededSupervisorFirstName: primaryFilterEmployee.firstName,
    /** Employee supervised by Olivia — expected in results when filtering by her as supervisor. */
    seededSupervisedEmployeeLastName: 'Okonkwo',
    /**
     * Secondary filter employee — Olivia Petrovic (061002): UI Engineer / Permanent / People Operations.
     * Used by TC-PIM-EL-014 to validate multiple records in a filtered result.
     */
    seededSecondEmployeeId: secondaryFilterEmployee.employeeId,
    seededSecondEmployeeLastName: secondaryFilterEmployee.lastName,
    seededSecondJobTitle: filterTestJobDetails[1].jobTitleName as string,
    seededSecondEmploymentStatus: filterTestJobDetails[1].employmentStatusName as string,
    seededSecondSubUnit: filterTestJobDetails[1].subUnitName as string,
  },
} as const;
