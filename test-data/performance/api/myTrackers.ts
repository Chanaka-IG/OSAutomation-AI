import { env } from "../../../src/config/env";


export type MyTrackerSeed = {
    trackerName: string,
    empNumber: number,
    reviewerEmpNumbers: number[];
}

export type MyLogSeed = {
    log: string,
    achievement: number,
    comment: string
}

export const trackers = {
    get orangehrmBaseURL(): string {
        return env.baseURL.replace(/\/$/, '');
    },

    adminPath: '/web/index.php/api/v2/performance/config/trackers',
    adminPathForTrackerRetriew: '/web/index.php/api/v2/performance/employees/trackers',
    /** ESS-accessible "My Trackers" endpoint (employee/reviewer scope). */
    essPath: '/web/index.php/api/v2/performance/trackers',
    getAllTrakers: '/web/index.php/api/v2/performance/employees/trackers',
    deleteTrackers : '/web/index.php/api/v2/performance/config/trackers',

    /** Glob for the per-tracker logs endpoint (`.../trackers/{id}/logs`); used to route-mock the logs view. */
    logsApiPattern: '**/api/v2/performance/trackers/*/logs**',
    


    get adminUrl(): string {
        return `${this.orangehrmBaseURL}${this.adminPath}`;
    },

    seedRecords: [
        {
            trackerName: "Test tracker for employee",
        },
    ],
    positiveLog: {
        log: "Positive via API",
        achievement: 1,
        comment: "Positive comment added"
    },
    negativeLog: {
        log: "Negative via API",
        achievement: 2,
        comment: "Negative comment added"
    },
    logForDelete: {
        log: "Delete log via API",
        achievement: 1,
        comment: "Delete log comment added"
    },
    logForvalidateDeleteModal: {
        log: "Log for validate delete modal",
        achievement: 1,
        comment: "Log for validate modal"
    },
    logForValidatePositiveFeedback: {
        log: "Log for validate feedback count for positive",
        achievement: 1,
        comment: "Log for validate feedback count"
    },
    logForValidateNegativeFeedback: {
        log: "Log for validate feedback count for Negative",
        achievement: 2,
        comment: "Log for validate feedback count"
    },
    trackerDataApi: {
        name: "Jacob - Tracker via API"
    },
    adminLog: {
        log: "Log by Admin",
        achievement: 2,
        comment: "Log by Admin added"
    },
    feedbackCheck: {
        name: "Jacob - Feedback Count check VIA API"
    },
    validateDeleteModalContent: {
        title: "Are you Sure?",
        body: "The selected record will be permanently deleted. Are you sure you want to continue?"
    },
    lengthValidation: {
        log: "Should not exceed 150 characters",
        comment: "Should not exceed 3000 characters"
    },
}