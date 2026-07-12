export type supervisorReview = {
  rating: number,
  comment: string,
  generalComment: string,
  finalRating: number,
  finalComment: string
};

export type reviewForm = {
  employeeName: string,
  /** Single name token — the supervisors autocomplete API only matches one word (verified live: "Andrew Symonds" → 0 hits, "Symonds" → 1). */
  supervisorSearch: string,
  /** Full option label ("First Middle Last") used for the exact-match click. */
  supervisorName: string,
};

export const manageReviews = {

  routes: {
    manageReviews: '/web/index.php/performance/searchPerformanceReview',
    reviewsAsSupervisor: '/web/index.php/performance/searchEvaluatePerformanceReview',
  },

  reviewData: {
    employeeName: 'Maraso Jack Kallis',
    supervisorSearch: 'Rezaa',
    supervisorName: 'Rezaa Diyago Hendricks'
  },
  saveReview: {
    employeeName: 'Adams Mugas Gilchrist',
    supervisorSearch: 'Marco',
    supervisorName: 'Marco Hales Janson'
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
  validateDataForCompleted: {
    employeeName: 'Maraso Kallis',
    reviewStatus: 'Completed'
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
    generalComment: "Supervisor general Review",
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
    supervisorSearch: 'Marco',
    supervisorName: 'Marco Hales Janson'
  },
  updateReviewValidate: {
    employeeName: 'Adams Gilchrist',
    reviewStatus: 'Activated'
  },
  dataForDeleteReview: {
    employeeName: 'Benjamin Walker',
    reviewStatus: 'Activated'
  },
  invalidNameInput: {
    employeeName: 'Nonexistent Person Zz'
  },
}
