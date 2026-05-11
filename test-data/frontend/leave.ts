/** UI strings, routes, and form values for Leave module tests. */

export const leave = {
  routes: {
    leaveList: '/web/index.php/leave/viewLeaveList',
  },
  urlPatterns: {
    leaveList: /viewLeaveList/i,
  },
  samples: {
    comment:
      'Annual leave: 5 working days for approved travel (manager signed off 12 May; ticket ref HR-44102).',
  },
} as const;
