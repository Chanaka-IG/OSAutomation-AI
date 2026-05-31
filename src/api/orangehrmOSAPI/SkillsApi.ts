import type { skillSeed } from "../../../test-data/pim/api/skills";
import { skills as skillsData } from "../../../test-data/pim/api/skills";
import { createLogger } from '../../lib/logger';
import { BaseApiService } from '../BaseApiService';

const log = createLogger('SkillsApi');

export class SkillsApi extends BaseApiService {

    async getAll(): Promise<Array<{ id: number; name: string, description: string }>> {
        const response = await this.get(skillsData.adminPath, {
            headers: { Accept: 'application/json' },
        });
        if (!response.ok()) {
            throw new Error(`SkillsApi.getAll failed: HTTP ${response.status()}`);
        }
        const json = (await response.json()) as { data: Array<{ id: number; name: string, description: string }> };
        return json.data ?? [];
    }

    async createIfAbsent(payload: skillSeed): Promise<void> {
        const all = await this.getAll();
        if (all.some((p) => p.name === payload.name)) {
            log.info(`Skill already exists, skipping: ${payload.name}`);
            return;
        }
        await this.create(payload);
    }

    async create(payload: skillSeed): Promise<void> {
        const response = await this.post(skillsData.adminPath, {
            data: {
                name: payload.name,
                description: payload.description
            },
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            }
        })
        if (!response.ok()) {
            const text = await response.text();
            log.error(`Failed to add skill: ${payload.name}`, {
                status: response.status(),
                body: text.slice(0, 400)
            });
            throw new Error(`SkillsApi.create failed: HTTP ${response.status()} ${payload.name}\n${text.slice(0, 600)}`);
        }

        log.info(`Skill successfully added: ${payload.name}`);
    }

}