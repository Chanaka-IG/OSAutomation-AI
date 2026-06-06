import type { KPIseed } from "../../../test-data/performance/api/kpis";
import { kpis as kpisData } from "../../../test-data/performance/api/kpis";
import { createLogger } from "../../lib/logger";
import { BaseApiService } from "../BaseApiService";

const log = createLogger('KpisApi');

/**
 * OrangeHRM Admin API v2 - employees.
 * Uses relative {@link kpisData.adminPath}; host is `orangehrmApiContext` `baseURL`
 * (= {@link kpisData.orangehrmBaseURL} / `BASE_URL`). Full URL: {@link kpisData.adminUrl}.
 */

export class KpisApi extends BaseApiService {

    async getAll(): Promise<Array<{ title: string, minRating: number, maxRating: number, jobTitleId: number, isDefault: boolean }>> {

        
        const response = await this.get(kpisData.adminPath, {
            headers: { Accept: 'application/json' },
        })
        if (!response.ok()) {
            console.log((await response.text()))
            throw new Error('Kpis.getAll failed: HTTP ${response.status()}')
        }
        const json = (await response.json()) as { data: Array<{ title: string, minRating: number, maxRating: number, jobTitleId: number, isDefault: boolean }> };
        return json.data ?? [];

    }

    async createIfAbsent(payload: KPIseed): Promise<void> {
        const all = await this.getAll();
        if (all.some((valKpi) => valKpi.title === payload.title)) {
            log.info(`KPI already exist, Skipping : ${payload.title}`)
            return
        }
        await this.create(payload);
    }

    async create(payload: KPIseed): Promise<void> {
        const response = await this.post(kpisData.adminPath, {
            data: {
                title: payload.title,
                minRating: payload.minRating,
                maxRating: payload.maxRating,
                jobTitleId: payload.jobTitleId,
                isDefault: payload.isDefault
            },
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        })

        if (!response.ok()) {
            const text = await response.text();
            log.error(`Failed to add KPI : ${payload.title}`, {
                status: response.status(),
                body: text.slice(0, 400),
            });
            throw new Error(`KpisApi.create failed: HTTP ${response.status()} ${payload.title}\n${text.slice(0, 600)}`);
        }
        log.info(`KPI successfully added : ${payload.title}`);
    }

    async getAllId(): Promise<Array<{ id: number, title: string }>> {
        const response = await this.get(kpisData.adminPath, {
            headers: { Accept: 'application/json' },
        })
        if (!response.ok()) {
            log.info((await response.text()))
            throw new Error('Kpis.getAllId failed: HTTP ${response.status()}')
        }
        const json = (await response.json()) as { data: Array<{ id: number, title: string }> };
        return json.data ?? [];

    }
    async deleteAllKpis(): Promise<void> {
        let idList : Array<number> = []
        const allKpis = await this.getAllId();
        for (const kpi of allKpis) {
            idList.push(kpi.id)
        }
        await this.deleteExistKpis(idList)

    }

    async deleteExistKpis(idList: Array<number>): Promise<void>{

        const response = await this.delete(kpisData.adminPath, {
            data: {
                ids: idList
            }
        })
        if (!response.ok()){
            log.error((await response.text()))
            throw new Error(`Failed to delete KPI`)
            return
        }
        log.info(`KPI successfully deleted. IDs: ${JSON.stringify(idList)}`)
    }
}

