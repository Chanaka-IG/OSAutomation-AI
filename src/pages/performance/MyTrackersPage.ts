import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "../BasePage";
import type { PositiveLog, LogData } from '../../../test-data/performance/frontend/myTrackers'
export class MyTrackersPage extends BasePage {

    readonly listTitle: Locator;
    readonly addLogBtn: Locator;
    readonly logInput: Locator;
    readonly commentInput: Locator;
    readonly postiveBtn: Locator;
    readonly negativeBtn: Locator;
    readonly saveBtn: Locator;
    readonly yesDeleteBtn: Locator;
    readonly logTitles: Locator;
    readonly paginationControl: Locator;


    constructor(page: Page) {
        super(page)
        this.listTitle = this.page.getByRole('heading', { name: 'Tracker Logs' })
        this.addLogBtn = this.page.getByRole('button', { name: 'Add Log' })
        this.logInput = this.page.locator('.oxd-input-group').filter({ hasText: 'Log' }).locator('.oxd-input').nth(0);
        this.commentInput = this.page.locator('.oxd-input-group').filter({ hasText: 'Comment' }).locator('.oxd-textarea').nth(0);
        this.postiveBtn = this.page.getByRole('button', { name: 'Positive' })
        this.negativeBtn = this.page.getByRole('button', { name: 'Negative' })
        this.saveBtn = this.page.getByRole('button', { name: 'Save' })
        this.yesDeleteBtn = this.page.getByRole('button', { name: ' Yes, Delete ' })
        this.logTitles = this.page.locator('.orangehrm-employee-tracker-log-title-text')
        this.paginationControl = this.page.locator('.oxd-pagination')
    }

    async viewTracker(trackerName: string): Promise<void> {
        const row = this.page.getByRole('row').filter({
            has: this.page.getByRole('cell', { name: trackerName, exact: true })
        })
        await row.getByRole('button', { name: 'View' }).click();
    }

    async validateTitle(title: string): Promise<void> {
        expect(await this.listTitle.textContent()).toEqual(title)
    }

    async clickAddLog(): Promise<void> {
        await this.addLogBtn.click();
    }

    async fillLog(logData: PositiveLog): Promise<void> {
        await this.page.locator('.orangehrm-modal-header').waitFor({ state: 'visible' })
        await this.logInput.waitFor({ state: 'visible' }).then(async () => {
            await this.logInput.click()
            await this.logInput.fill(logData.log)
        })
        if (logData.type === "positive") {
            await this.postiveBtn.click();
        }
        else {
            await this.negativeBtn.click();
        }
        await this.commentInput.fill(logData.Comment)
    }

    async clickSaveLogBtn(): Promise<void> {
        await this.saveBtn.click();
    }

    async getLogDetails(logData: string): Promise<LogData> {

        const logArea = this.page.locator('.orangehrm-employee-tracker-log-content-section').filter({ hasText: logData });
        const reviewerName = (await logArea
            .locator('.orangehrm-employee-tracker-log-reviewer-name').first()
            .textContent())?.trim();

        const logTitle = (await logArea
            .locator('.orangehrm-employee-tracker-log-title-text').first()
            .textContent())?.trim();

        const logBody = (await logArea
            .locator('.orangehrm-employee-tracker-log-body').first()
            .textContent())?.trim();

        const date = (await logArea
            .locator('.orangehrm-employee-tracker-log-reviewer-date-container').first()
            .textContent())?.trim();

        if (!reviewerName || !logTitle || !logBody || !date) {
            throw new Error(`Log not found or incomplete: ${logData}`);
        }

        return {
            reviewerName,
            logTitle,
            logBody,
            date
        };
    }

    async clickEditLog(logData: string): Promise<void> {
        const logArea = this.page.locator('.orangehrm-employee-tracker-log-content-section').filter({ hasText: logData }).first();
        await logArea.locator('.oxd-table-dropdown button').click();
        await logArea.getByText('Edit', { exact: true }).click();
    }

    async clickDeleteLog(logData: string): Promise<void> {
        const logArea = this.page.locator('.orangehrm-employee-tracker-log-content-section').filter({ hasText: logData }).first();
        await logArea.locator('.oxd-table-dropdown button').click();
        await logArea.getByText('Delete', { exact: true }).click();
    }
    async clickYesDeleteBtn(): Promise<void> {
        await this.yesDeleteBtn.click();
    }
    logRowByText(logData: string): Locator {
        return this.page.locator('.orangehrm-employee-tracker-log-content-section').filter({ hasText: logData });
    }
    verifyInlineRequired(): [Locator, Locator] {
        return [
            this.page.locator('.oxd-form-row')
                .filter({ hasText: 'Log' })
                .getByText('Required', { exact: true }),

            this.page.locator('.oxd-form-row')
                .filter({ hasText: 'Comment' })
                .getByText('Required', { exact: true })
        ];

    }
    checkEditability(logData: string): Locator {
        const row = this.page.locator('.orangehrm-employee-tracker-log-content-section').filter({ hasText: logData });
        return row.locator('.bi-three-dots-vertical')
    }
}
