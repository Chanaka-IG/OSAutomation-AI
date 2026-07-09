export type supervisorReview = {
  rating: number,
  comment: string,
  generalComment: string,
  finalRating: number,
  finalComment: string
};

export const manageReviews = {

  routes: {
    manageReviews: '/web/index.php/performance/searchPerformanceReview',
    reviewsAsSupervisor: '/web/index.php/performance/searchEvaluatePerformanceReview',
  },

  reviewData: {
    employeeName: 'Maraso Jack Kallis',
    supervisorName: 'Rezaa'
  },
  saveReview: {
    employeeName: 'Adams Mugas Gilchrist',
    supervisorName: 'Marco'
  },

  jobTitle: {
    title: "Job Title with KPI",
    description: "This is created for manage-reviews tests",
    note: "This is created for manage-reviews tests"
  },

  validateData: {
    employeeName: 'Maraso Kallis',
    reviewStatus: 'Activated'
  },
  validateDataForSave: {
    employeeName: 'Adams Gilchrist',
    reviewStatus: 'Inactive'
  },
  validateDataForComplete: {
    employeeName: 'Shane Warne',
    reviewStatus: 'Activated'
  },
  validateDataForSaveReview: {
    displayName: 'Daniel Wilson',
    reviewStatus: 'Inactive'
  },
  logasSupervisor: {
    username: "Rezaa",
    password: "admin@OHRM123"
  },
  validateDataForSearch: {
    employeeName: 'Daniiel Vittori',
    jobTitle: 'Job Title with KPI',
    reviewer: 'Jonothan Trott',
    reviewStatus: 'Activated'
  },
  supervisorReview: {
    rating: 30,
    comment: "Supervisor Review",
    generalComment: "Supervisor geberal Review",
    finalRating: 40,
    finalComment: "Final comment added"
  },
  searchCriteria: {
    employeeName: 'Daniiel Jasmis Vittori',
  },
  validateSupervisor: {
    supervisorForSearch: 'Marco',
    employeeName: 'Adams Mugas Gilchrist',
    supervisorName: 'Marco Hales Janson'
  },
  updateReview: {
    employeeName: 'Adams Mugas Gilchrist',
    supervisorName: 'Marco'
  },
  dataForDeleteReview: {
    employeeName: 'Benjamin Walker',
    reviewStatus: 'Activated'
  },
    invalidNameInput: {
    employeeName: 'Benjamin Walker',
    reviewStatus: 'Activated'
  },
}