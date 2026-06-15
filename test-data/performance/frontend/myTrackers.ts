/** UI strings, routes, and form values for Performance module tests. */
export interface PositiveLog {
  log: string,
  type: string,
  Comment: string
}

export interface LogData {
  reviewerName : string,
  logTitle: string,
  logBody: string,
  date : string,
}

export const myTrackers = {
  routes: {
    myTrackerList: '/web/index.php/performance/viewMyPerformanceTrackerList',
  },
  urlPatterns: {
    addTracker: /addPerformanceTracker/i,
    trackerList: /viewPerformanceTracker/i,
    login: /auth\/login/i,
  },
  employees: [{
    employeeId: '0200',
    firstName: 'Moshan',
    lastName: 'Rodrigas',
    middleName: 'Pesuala',
    username: 'Mosan',
    password: 'admin@OHRM123',
    status: true,
    userRoleId: 2,
  },
  {
    employeeId: '0201',
    firstName: 'Jacob',
    lastName: 'Oram',
    middleName: 'Puntasa',
    username: 'Jacob',
    password: 'admin@OHRM123',
    status: true,
    userRoleId: 2,
  },
  ],
  trackerDataFrontend: {
    name: "Jacob - Tracker"
  },
  myTrackerUI: {
    title: "Tracker Logs"
  },
  positiveLog: {
    log: "This is a positive logs",
    type: "positive",
    Comment: "Positive comment added"
  },
    negativeLog: {
    log: "This is a negative logs",
    type: "negative",
    Comment: "Negative comment added"
  },
} as const;
