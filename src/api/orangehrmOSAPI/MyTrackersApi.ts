import type { MyTrackerSeed } from '../../../test-data/pim/api/myTrackers';
import { myTrackeers as myTrackeersData } from '../../../test-data/pim/api/myTrackers';
import { createLogger } from '../../lib/logger';
import { BaseApiService } from '../BaseApiService';

const log = createLogger('PayGradesApi');


export class MyTrackersApi extends BaseApiService {

    async getAll(): Promise<Array<{ id: number; trackerName: string }>> {
        const response = await this.get(myTrackeersData.adminPath, {
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
        const response = await this.post(myTrackeersData.adminPath, {
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

}