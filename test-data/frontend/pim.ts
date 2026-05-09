/** UI strings, routes, and form values for PIM module tests. */

export const pim = {
  routes: {
    employeeList: '/web/index.php/pim/viewEmployeeList',
  },
  urlPatterns: {
    employeeList: /viewEmployeeList/i,
  },
  samples: {
    employeeFirstName: 'Automation',
    employeeLastName: 'User',
  },
} as const;
