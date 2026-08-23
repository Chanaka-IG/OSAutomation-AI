import { buzzData } from '../../../test-data/buzz/frontend/buzzData';
import { createLogger } from '../../lib/logger';
import { BaseApiService } from '../BaseApiService';
import { postRecords as postRecordsData } from '../../../test-data/buzz/api/buzzDataApi';

const log = createLogger('BuzzApi');

export class BuzzApi extends BaseApiService {

    async postBuzzFeedIfAbsent(postContent: postRecordsData) {
        const feedData = await this.getBuzzFeed();
        if (feedData.data.some((e: { text?: string }) => e.text === postContent.text)) {
            log.info(`Post already exists, skipping: ${postContent.text}`);
            return;
        }
        const res = await this.post(buzzData.apiPaths.feed, {
            data: postContent,
            headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok()) {
            throw new Error(`BuzzApi.postBuzzFeed failed: HTTP ${res.status()}`);
        }
        log.info(`BuzzApi.postBuzzFeed successful: ${JSON.stringify(postContent)}`);
        return (await res.json()) as { data: any };
    }

    async getBuzzFeed() {
        const res = await this.get(buzzData.apiPaths.getFeed, {
            headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok()) {
            throw new Error(`BuzzApi.getBuzzFeed failed: HTTP ${res.status()}`);
        }
        log.info(`BuzzApi.getBuzzFeed successful`);
        return (await res.json()) as { data: any };
    }
}