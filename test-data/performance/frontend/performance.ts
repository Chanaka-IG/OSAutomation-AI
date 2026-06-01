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
  ]
    
   
} as const;
