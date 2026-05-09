/** UI strings, routes, and form values for Leave module tests. */

export const leave = {
  routes: {
    leaveList: '/web/index.php/leave/viewLeaveList',
  },
  urlPatterns: {
    leaveList: /viewLeaveList/i,
  },
  samples: {
    comment: 'Automated leave request',
  },
} as const;
