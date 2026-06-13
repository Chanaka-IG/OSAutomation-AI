import { env } from "../../../src/config/env";


export type MyTrackerSeed = {
    trackerName: string,
    empNumber : number,
    reviewerEmpNumbers: number[];
}

export const myTrackeers = {
    get orangehrmBaseURL(): string {
        return env.baseURL.replace(/\/$/, '');
    },

    adminPath: '/web/index.php/api/v2/performance/config/trackers',

    get adminUrl(): string {
        return `${this.orangehrmBaseURL}${this.adminPath}`;
    },

    seedRecords : [{
        trackerName : "Test tracker for employee",
    }] ,
}