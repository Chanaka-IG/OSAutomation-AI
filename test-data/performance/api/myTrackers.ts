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
    trackerDataApi: {
        name: "Jacob - Tracker via API"
    },
    adminLog: {
        log: "Log by Admin",
        achievement: 2,
        comment: "Log by Admin added"
    },
    /** Dedicated tracker for TC-404 (many-logs ordering); kept separate so its bulk logs don't pollute other specs. */
    orderTracker: {
        name: "Jacob - Order Tracker via API"
    },
    /**
     * Bulk logs for TC-404, seeded in creation order (01 -> 12). The OS My Trackers log view shows
     * newest-created first, so the UI order is the reverse of this array.
     */
    bulkLogs: Array.from({ length: 12 }, (_, i) => ({
        log: `Bulk log ${String(i + 1).padStart(2, '0')}`,
        achievement: (i % 2) + 1,
        comment: `Bulk comment ${i + 1}`,
    })) as MyLogSeed[],
}