/** UI strings, routes, and form values for Admin → Job → Pay Grades tests. */

export const adminPayGrades = {
  routes: {
    list: '/web/index.php/admin/viewPayGrades',
    add: '/web/index.php/admin/payGrade',
    /** Edit page is `/admin/payGrade/{id}` — see `editPattern`. */
  },
  urlPatterns: {
    list: /viewPayGrades/i,
    add: /admin\/payGrade$/i,
    /** Save on the Add form redirects to the edit page `/admin/payGrade/<id>`. */
    edit: /admin\/payGrade\/\d+$/i,
  },
  /** Validation messages verified live on the kord instance (2026-06-08). */
  messages: {
    required: 'Required',
    alreadyExists: 'Already exists',
    /** Pay-grade name cap is 50 (Job Titles is 100 — do not reuse). */
    maxLength: 'Should not exceed 50 characters',
    minSalaryTooHigh: 'Should be lower than Maximum Salary',
    maxSalaryTooLow: 'Should be higher than Minimum Salary',
    /** Rendered to ESS/unauthorised users on direct admin URLs. */
    credentialRequired: 'Credential Required',
  },
  /** Hard-delete confirmation dialog copy (verified live). */
  deleteDialog: {
    title: 'Are you Sure?',
    body: 'The selected record will be permanently deleted. Are you sure you want to continue?',
    confirm: 'Yes, Delete',
    cancel: 'No, Cancel',
  },
  samples: {
    /** 51 chars — exceeds the 50-char name limit. */
    overlongName: 'A'.repeat(51),
    /** A currency picked for happy-path band tests (full name shown in the grid). */
    currencyOption: 'USD - United States Dollar',
    currencyGridName: 'United States Dollar',
    minSalary: '50000',
    maxSalary: '90000',
    minSalaryFormatted: '50,000.00',
    maxSalaryFormatted: '90,000.00',
  },
  /** Seeded master-data grade reused (READ-ONLY!) for the duplicate-name check. */
  masterData: {
    duplicateName: 'Band A — Associate',
  },
} as const;
