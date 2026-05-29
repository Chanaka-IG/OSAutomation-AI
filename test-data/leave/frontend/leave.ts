/** UI strings, routes, and form values for Leave module tests. */

export const leave = {
  routes: {
    leaveList: '/web/index.php/leave/viewLeaveList',
    assignLeave: '/web/index.php/leave/assignLeave',
  },
  urlPatterns: {
    leaveList: /viewLeaveList/i,
    assignLeave: /assignLeave/i,
    login: /auth\/login/i,
  },
  duration: {
    fullDay: 'Full Day',
    firstHalf: 'Half Day - Morning',
    secondHalf: 'Half Day - Afternoon',
    specifyTime: 'Specify Time',
  },
  samples: {
    comment:
      'Annual leave: 5 working days for approved travel (manager signed off 12 May; ticket ref HR-44102).',
    assignComment: 'Leave assigned by admin on behalf of employee.',
  },
} as const;
