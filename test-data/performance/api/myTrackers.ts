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

    /** ESS-accessible "My Trackers" endpoint (employee/reviewer scope). */
    essPath: '/web/index.php/api/v2/performance/trackers',

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
    trackerDataApi: {
        name: "Jacob - Tracker via API"
    },
}