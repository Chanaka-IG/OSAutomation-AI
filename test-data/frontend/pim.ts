import { filterTestJobDetails, primaryFilterEmployee } from '../frontend-api/pim/employees';

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
    /** Aligned with {@link ../frontend-api/pim/employees} `ensurePimFilterEmployees` seeds. */
    employeeFirstName: primaryFilterEmployee.firstName,
    employeeLastName: primaryFilterEmployee.lastName,
    seededEmployeeName: primaryFilterEmployee.firstName,
    seededEmployeeId: primaryFilterEmployee.employeeId,
    /**
     * Job detail filter samples — aligned with `filterTestJobDetails` (TC-PIM-EL-008–011).
     * Olivia Nguyen (061001): QA Engineer / Permanent / Engineering.
     * Samuel Okonkwo (061003): supervised by Olivia.
     */
    seededJobTitle: filterTestJobDetails[0].jobTitleName as string,
    seededEmploymentStatus: filterTestJobDetails[0].employmentStatusName as string,
    seededSubUnit: filterTestJobDetails[0].subUnitName as string,
    /** First name to type into Supervisor Name autocomplete (resolves to Olivia Nguyen). */
    seededSupervisorFirstName: primaryFilterEmployee.firstName,
    /** Employee supervised by Olivia — expected in results when filtering by her as supervisor. */
    seededSupervisedEmployeeLastName: 'Okonkwo',
  },
} as const;
