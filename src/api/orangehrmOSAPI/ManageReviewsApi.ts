import { BaseApiService } from "../BaseApiService";
import { createLogger } from '../../lib/logger';
import { reviewData } from '../../../test-data/performance/api/manageReviews';
import type { reviewAPI } from '../../../test-data/performance/api/manageReviews';

const log = createLogger('ManageReviews');

type reviewListItem = {
    id: number,
    reviewPeriodStart: string,
    reviewPeriodEnd: string,
    dueDate: string,
    employee: { empNumber: number },
    reviewer: { employee: { empNumber: number } },
};

export class ManageReviewsApi extends BaseApiService {

    async getAll(): Promise<reviewListItem[]> {
        // limit=0 disables paging so lookups see every review, not just the first page
        const response = await this.get(`${reviewData.adminPath}?limit=0`, {
            headers: { Accept: 'application/json' },
        })
        if (!response.ok()) {
            throw new Error(`Failed to retrieve the performance review list`)
        }
        const json = (await response.json()) as { data: reviewListItem[] };
        return json.data ?? [];
    }

    async createIfAbsent(review: reviewAPI): Promise<void> {
        const all = await this.getAll();
        const exists = all.some((item) =>
            item.employee?.empNumber === review.empNumber &&
            item.reviewer?.employee?.empNumber === review.reviewerEmpNumber &&
            item.reviewPeriodStart === review.startDate &&
            item.reviewPeriodEnd === review.endDate,
        );
        if (exists) {
            log.info(`Review already exists, skipping: employee ${review.empNumber}`);
            return;
        }
        await this.createReview(review);
    }

    async createReview(review: reviewAPI): Promise<void> {
        const response = await this.post(reviewData.adminPath, {
            headers: { Accept: 'application/json' },
            data: review
        })
        if (!response.ok()) {
            throw new Error(`Failed to create review`)
        }
        log.info(`Review created successfully for employee ${review.empNumber} with reviewer ${review.reviewerEmpNumber}`)
    }

    /** Deletes only the reviews belonging to the given employees, never the whole list. */
    async deleteReviewsForEmployees(empNumbers: number[]): Promise<void> {
        const targets = new Set(empNumbers);
        const reviews = await this.getAll();
        const deleteIds = reviews.filter((item) => targets.has(item.employee?.empNumber)).map((item) => item.id);
        if (deleteIds.length === 0) {
            log.info(`No review records found to delete`)
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

        log.info(`Deleted ${deleteIds.length} review record(s) belonging to the suite's employees`)
    }

}
