/** UI strings, routes, and form values for Performance module tests. */

export const performance = {
  routes: {
    saveKpis: '/web/index.php/performance/saveKpi',
    kpisList: 'web/index.php/performance/searchKpi',
  },
  urlPatterns: {
    kpiList: /searchKpi/i,
    addKpi: /saveKpi/i,
    login: /auth\/login/i,
  },
  validationMsges: {
    rating: "Minimum Rating should be less than Maximum Rating",
    outScale: "Should be a number between 0-100"
  },
  toastMsg : {
    success : "Successfully Saved",
    update : "Successfully Updated",
    delete : "Successfully Deleted"
  },
  employees: [{
    employeeId: '0100',
    firstName: 'Peter',
    lastName: 'Patigo',
    middleName: 'Roger',
  },
  {
    employeeId: '0101',
    firstName: 'Joshua',
    lastName: 'Little',
    middleName: 'Petea',
  },
  ],
  validKpi: {
    name: 'Test KPI',
    description: 'This is a test KPI created for automation testing.',
    jobTitle: 'Software Engineer',
    minimumRating: '1',
    maximumRating: '5',
    makeDefault: true,
  },
  validScale: {
    name: 'Test KPI Default Scale',
    description: 'This is a test KPI created for valid scale testing.',
    jobTitle: 'Software Engineer',
    minimumRating: '25',
    maximumRating: '75',
    makeDefault: true,
  },
  invalidScale: {
    name: 'Invalid KPI',
    description: 'This is a test KPI created for valid scale testing.',
    jobTitle: 'Software Engineer',
    minimumRating: '75',
    maximumRating: '25',
    makeDefault: false,
  },
  outOfScale: {
    name: 'Invalid KPI',
    description: 'This is a test KPI created for valid scale testing.',
    jobTitle: 'Software Engineer',
    minimumRating: '75',
    maximumRating: '125',
    makeDefault: false,
  },
  updateKpi: [{
    name: 'Test KPI Update',
    description: 'This is updated',
    jobTitle: 'QA Engineer',
    minimumRating: '2',
    maximumRating: '9',
    makeDefault: undefined,
  },
  {
    name: '',
    description: '',
    jobTitle: '',
    minimumRating: '13',
    maximumRating: '29',
    makeDefault: false,
  }],

  userData: {
    username: 'UserForKpiTest',
    password: 'admin@OHRM123',
    status: true,
    userRoleId: 2,
  },

  jobRole : {
    vacancy : "QA Engineer"
  }

} as const;
