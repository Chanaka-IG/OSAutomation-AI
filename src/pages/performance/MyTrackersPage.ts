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


    constructor(page: Page) {
        super(page)
        this.listTitle = this.page.getByRole('heading', { name: 'Tracker Logs' })
        this.addLogBtn = this.page.getByRole('button', { name: 'Add Log' })
        this.logInput = this.page.locator('.oxd-input-group').filter({ hasText: 'Log' }).locator('.oxd-input').nth(0);
        this.commentInput = this.page.locator('.oxd-input-group').filter({ hasText: 'Comment' }).locator('.oxd-textarea').nth(0);
        this.postiveBtn = this.page.getByRole('button', { name: 'Positive' })
        this.negativeBtn = this.page.getByRole('button', { name: 'Negative' })
        this.saveBtn = this.page.getByRole('button', { name: 'Save' })
    }

    async viewTracker(trackerName: string): Promise<void> {
        const row = this.page.locator('.orangehrm-container').filter({hasText : new RegExp(`^${trackerName}$`)})
        await row.getByRole('button', { name: 'View' }).click();
    }

    async validateTitle(title: string): Promise<void> {
        expect(await this.listTitle.textContent()).toEqual(title)
    }

    async clickAddLog(): Promise<void> {
        await this.addLogBtn.click();
    }

    async fillLog(logData: PositiveLog): Promise<void> {
        await this.page.locator('.oxd-sheet').waitFor({ state: 'visible' })
        await this.logInput.fill(logData.log)

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

        const logArea = this.page.locator('.oxd-sheet').filter({hasText : logData});
        const reviewerName = (await logArea
            .locator('.orangehrm-employee-tracker-log-reviewer-name')
            .textContent())?.trim();

        const logTitle = (await logArea
            .locator('.orangehrm-employee-tracker-log-title-text')
            .textContent())?.trim();

        const logBody = (await logArea
            .locator('.orangehrm-employee-tracker-log-body')
            .textContent())?.trim();

        const date = (await logArea
            .locator('.orangehrm-employee-tracker-log-reviewer-date-container')
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

    async clickEditLog(logData:string): Promise<void>{
        const logArea = this.page.locator('.oxd-table-row').filter({hasText : new RegExp(`^${logData}$`)});
        await logArea.locator('.bi-three-dots-vertical').click();
        await logArea.getByText('Edit', {exact: true}).click();
    }
}
