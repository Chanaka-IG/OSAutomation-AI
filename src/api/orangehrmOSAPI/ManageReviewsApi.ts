import { env } from "node:process";
import { BaseApiService } from "../BaseApiService";
import { createLogger, logger } from '../../lib/logger';
import { reviewData } from '../../../test-data/performance/api/manageReviews';
import type { reviewAPI } from '../../../test-data/performance/api/manageReviews';


const log = createLogger('ManagerReviews');

export class ManageReviewsApi extends BaseApiService {

    async getAll(): Promise<Array<{ id: number }>> {
        const response = await this.get(reviewData.adminPath, {
            headers: { Accept: 'application/json' },
        })
        if (!response.ok()) {
            throw new Error(`Failed to retrieve data from My Tracker list`)
        }
        const json = (await response.json()) as { data: Array<{ id: number }> };
        return json.data ?? [];
    }

    async createReview(review: reviewAPI): Promise<void> {
        const response = await this.post(reviewData.adminPath, {
            headers: { Accept: 'application/json' },
            data: review
        })
        if (!response.ok()) {
            throw new Error(`Failed to create review`)
        }
        logger.info(`Review created successfully for employee ${review.empNumber} with reviewer ${review.reviewerEmpNumber}`)
    }

    async deleteAllReviews(): Promise<void> {
        const reviews = await this.getAll();
        const deleteIds = reviews.map((item) => item.id)
        if (deleteIds.length === 0) {
            logger.info(`No review records found to delete`)
            return;
        }
        const response = await this.delete(reviewData.adminPath, {
            data: {
                ids: deleteIds
            }
        })

        if (!response.ok()) {
            throw new Error(`Failed to delete reviews`)
        }

        logger.info(`All the review records removed successfully`)
    }

}