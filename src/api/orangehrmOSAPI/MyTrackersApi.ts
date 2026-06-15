import type { MyTrackerSeed,MyLogSeed } from '../../../test-data/performance/api/myTrackers';
import { trackers as myTrackersData } from '../../../test-data/performance/api/myTrackers';
import { createLogger } from '../../lib/logger';
import { BaseApiService } from '../BaseApiService';

const log = createLogger('PayGradesApi');


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
                `LeaveRequestsApi.apply failed: HTTP ${response.status()}}`,
            );

        }
        log.info(`My Tracker successfully added: ${payload.trackerName}`);
    }

    async getTrackerIdByName(trackerName: string): Promise<number | undefined> {
        const response = await this.get(myTrackersData.essPath, {
            headers: { Accept: 'application/json' },
        })
        if (!response.ok()) {
            throw new Error(`Failed to retrieve data from My Tracker list: HTTP ${response.status()}`)
        }
        const json = (await response.json()) as { data: Array<{ id: number; trackerName: string }> };
        return json.data?.find((tracker) => tracker.trackerName === trackerName)?.id;
    }

    async addLog(id: number | undefined, payload : MyLogSeed): Promise<void> {
        const response = await this.post(`/web/index.php/api/v2/performance/trackers/${id}/logs`, {
            data: payload
        })
        if (!response.ok()) {
            console.log(await response.text())
            log.error(`Employee tracker log add failed`)
            throw new Error(`Failed to add the log: HTTP ${response.status()}`)
        }
        log.info(`Successfully added the log`)
    }

    async addLogAsESS(trackerName: string, payload : MyLogSeed): Promise<void> {
        const id = await this.getTrackerIdByName(trackerName);
        await this.addLog(id, payload)
    }
}