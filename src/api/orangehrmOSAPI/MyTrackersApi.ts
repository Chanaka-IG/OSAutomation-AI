import type { MyTrackerSeed, MyLogSeed } from '../../../test-data/performance/api/myTrackers';
import { trackers as myTrackersData } from '../../../test-data/performance/api/myTrackers';
import { createLogger } from '../../lib/logger';
import { BaseApiService } from '../BaseApiService';

const log = createLogger('MyTrackerAPI');


export class MyTrackersApi extends BaseApiService {

    async getAll(): Promise<Array<{ id: number; trackerName: string }>> {
        const response = await this.get(myTrackersData.adminPath, {
            headers: { Accept: 'application/json' },
        })
        if (!response.ok()) {
            throw new Error(`Failed to retiew data from My Tracker list`)
        }
        const json = (await response.json()) as { data: Array<{ id: number; trackerName: string }> };
        return json.data ?? [];
    }

    async createIfAbsent(payload: MyTrackerSeed): Promise<void> {
        const all = await this.getAll();

        if (all.some((p) => p.trackerName === payload.trackerName)) {
            log.info(`My Tracker already exist, skipping: ${payload.trackerName}`);
            return;
        }
        await this.create(payload);

    }
    async create(payload: MyTrackerSeed): Promise<void> {
        const response = await this.post(myTrackersData.adminPath, {
            data: payload,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        })

        if (!response.ok()) {
            throw new Error(
                `My Tracker apply failed: HTTP ${response.status()}}`,
            );

        }
        log.info(`My Tracker successfully added: ${payload.trackerName}`);
    }

    /**
     * Server's current date (`YYYY-MM-DD`) from the attendance current-datetime endpoint.
     * Prefers the display-timezone date (`userDate`) and falls back to `utcDate`, so log-date
     * assertions match what the app renders for a just-created log — not the test runner's UTC clock.
     */
    async getServerDate(): Promise<string> {
        const response = await this.get('/web/index.php/api/v2/attendance/current-datetime', {
            headers: { Accept: 'application/json' },
        })
        if (!response.ok()) {
            throw new Error(`Failed to retrieve server date: HTTP ${response.status()}`)
        }
        const json = (await response.json()) as { data: { utcDate: string; userDate?: string } };
        return json.data.userDate ?? json.data.utcDate;
    }

    async getTrackerIdByNameForAdminLogs(trackerName: string): Promise<number | undefined> {
        const response = await this.get(myTrackersData.adminPathForTrackerRetriew, {
            headers: { Accept: 'application/json' },
        })
        if (!response.ok()) {
            throw new Error(`Failed to retrieve data from My Tracker list: HTTP ${response.status()}`)
        }
        const json = (await response.json()) as { data: Array<{ id: number; title: string }> };
        return json.data?.find((tracker) => tracker.title === trackerName)?.id;
    }

    async getTrackerIdByNameForESSLogs(trackerName: string): Promise<number | undefined> {
        const response = await this.get(myTrackersData.essPath, {
            headers: { Accept: 'application/json' },
        })
        if (!response.ok()) {
            throw new Error(`Failed to retrieve data from My Tracker list: HTTP ${response.status()}`)
        }
        const json = (await response.json()) as { data: Array<{ id: number; trackerName: string }> };
        return json.data?.find((tracker) => tracker.trackerName === trackerName)?.id;
    }

    async getLogs(id: number | undefined): Promise<Array<{ id: number; log: string }>> {
        const response = await this.get(`/web/index.php/api/v2/performance/trackers/${id}/logs`, {
            headers: { Accept: 'application/json' },
        })
        if (!response.ok()) {
            throw new Error(`Failed to retrieve logs for tracker ${id}: HTTP ${response.text()}`)
        }
        const json = (await response.json()) as { data: Array<{ id: number; log: string }> };
        return json.data ?? [];
    }

    async addLog(id: number | undefined, payload: MyLogSeed): Promise<void> {
        const response = await this.post(`/web/index.php/api/v2/performance/trackers/${id}/logs`, {
            data: payload
        })
        if (!response.ok()) {
            log.error(`Employee tracker log add failed`)
            throw new Error(`Failed to add the log: HTTP ${response.status()}`)
        }
        log.info(`Successfully added the log`)
    }

    async addLogIfAbsent(id: number | undefined, payload: MyLogSeed): Promise<void> {
        const all = await this.getLogs(id);
        if (all.some((l) => l.log === payload.log)) {
            log.info(`Tracker log already exist, skipping: ${payload.log}`);
            return;
        }
        await this.addLog(id, payload);
    }

    async addLogAsAdmin(trackerName: string, payload: MyLogSeed): Promise<void> {
        const id = await this.getTrackerIdByNameForAdminLogs(trackerName);
        await this.addLogIfAbsent(id, payload)
    }

    async addLogAsESS(trackerName: string, payload: MyLogSeed): Promise<void> {
        const id = await this.getTrackerIdByNameForESSLogs(trackerName);
        await this.addLogIfAbsent(id, payload)
    }
}