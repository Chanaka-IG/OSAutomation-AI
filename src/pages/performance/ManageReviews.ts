import { stat } from "node:fs";
import { BasePage } from "../BasePage";
import { Page, Locator, expect } from "@playwright/test";
import type { supervisorReview } from '../../../test-data/performance/frontend/manageReviews'

export class ManageReviews extends BasePage {

    readonly addBtn: Locator;
    readonly employeeNameInput: Locator;
    readonly supervisorNameInput: Locator;
    readonly startDate: Locator;
    readonly endDate: Locator;
    readonly dueDate: Locator;
    readonly activeBtn: Locator;
    readonly rating: Locator;
    readonly comment: Locator;
    readonly generalComment: Locator;
    readonly completionDate: Locator;
    readonly finalRating: Locator;
    readonly finalComment: Locator;
    readonly saveBtn: Locator;
    readonly completeBtn: Locator;
    readonly okBtn: Locator;
    readonly accessDeniedMsg: Locator;
    readonly searchBtn: Locator;
    readonly yesDeleteBtn: Locator;

    constructor(page: Page) {
        super(page)
        this.addBtn = this.page.getByRole('button', { name: 'Add' })
        this.employeeNameInput = this.page.locator('.oxd-grid-item').filter({ hasText: /^Employee Name$/ }).locator('input')
        this.supervisorNameInput = this.page.locator('.oxd-grid-item').filter({ hasText: /^Supervisor Reviewer$/ }).locator('input')
        this.startDate = this.page.locator('.oxd-grid-item').filter({ hasText: /^Review Period Start Date$/ }).locator('input')
        this.endDate = this.page.locator('.oxd-grid-item').filter({ hasText: /^Review Period End Date$/ }).locator('input')
        this.dueDate = this.page.locator('.oxd-grid-item').filter({ hasText: /^Due Date$/ }).locator('input')
        this.activeBtn = this.page.getByRole('button', { name: 'Activate' })
        this.rating = this.page.locator('.oxd-grid-4.orangehrm-evaluation-grid').getByRole('textbox').first();
        this.comment = this.page.locator('.oxd-grid-4.orangehrm-evaluation-grid').getByRole('textbox').nth(1);
        this.generalComment = this.page.locator('.oxd-grid-3.orangehrm-evaluation-grid').getByRole('textbox')
        this.completionDate = this.page.locator('.orangehrm-performance-review-grid').getByPlaceholder('yyyy-mm-dd');
        this.finalRating = this.page.locator('.oxd-grid-4.orangehrm-performance-review-grid').getByRole('textbox').nth(1)
        this.finalComment = this.page.locator('.oxd-grid-4.orangehrm-performance-review-grid').getByRole('textbox').nth(2)
        this.saveBtn = this.page.getByRole('button', { name: 'Save' })
        this.completeBtn = this.page.getByRole('button', { name: 'Complete' })
        this.okBtn = this.page.getByRole('button', { name: 'Ok' })
        this.accessDeniedMsg = this.page.getByText('Credential Required', { exact: true })
        this.searchBtn = this.page.getByRole('button', { name: 'Search' })
        this.yesDeleteBtn = this.page.getByRole('button', { name: 'Yes, Delete' })
    }
    async clickOnAddReview(): Promise<void> {
        await this.addBtn.click();
    }

    async fillReview(empName: string, supervisorName: string, startDate: string, endDate: string, dueDate: string): Promise<void> {
        await this.selectEmployee(empName);
        await this.selectSupervisor(supervisorName);
        await this.fillStartDate(startDate);
        await this.fillEndDate(endDate);
        await this.fillDueDate(dueDate);
    }

    async selectEmployee(empName: string): Promise<void> {
        await this.employeeNameInput.click();
        await this.employeeNameInput.clear();
        await this.employeeNameInput.pressSequentially(empName);
        const option = this.page.getByRole('option', { name: empName, exact: true });
        await option.waitFor({ state: 'visible', timeout: 8_000 });
        await option.click();
    }

    async selectSupervisor(supervisorName: string): Promise<void> {
        await this.supervisorNameInput.click();
        await this.supervisorNameInput.clear();
        await this.supervisorNameInput.pressSequentially(supervisorName);
        const option = this.page.getByRole('option', { name: supervisorName });
        await option.waitFor({ state: 'visible', timeout: 8_000 });
        await option.click();
    }
    async validateSupervisor(supervisorName: string): Promise<{ optionCount: number; option: string | null; }> {
        await this.supervisorNameInput.click();
        await this.supervisorNameInput.pressSequentially(supervisorName);
        await this.page.getByRole('option', { name: supervisorName }).waitFor({ state: 'visible', timeout: 8_000 });
        const optionCount = await this.page.getByRole('option').count();
        const option = await this.page.getByRole('option').first().textContent();
        return {
            optionCount: optionCount,
            option: option
        };
    }

    async fillStartDate(startDate: string): Promise<void> {
        await this.pickDateFromDatePicker(startDate, this.startDate)
    }

    async fillEndDate(endDate: string): Promise<void> {
        await this.pickDateFromDatePicker(endDate, this.endDate)
    }

    async fillDueDate(dueData: string): Promise<void> {
        await this.pickDateFromDatePicker(dueData, this.dueDate)
    }

    async clickActivateBtn(): Promise<void> {
        await this.activeBtn.click()
    }

    async checkReviewStatusAsAdmin(employeeName: string): Promise<string> {
        const status = await this.page.getByRole('row').filter({ hasText: employeeName }).first().locator('[role="cell"]').nth(6).textContent();
        return status ?? "";
    }

    async clickOnActionAsSupervisor(employeeName: string): Promise<void> {
        await this.page.getByRole('row').filter({ hasText: employeeName }).getByTitle('Evaluate').click();

    }
    async clickOnDeleteReview(employeeName: string): Promise<void> {
        await this.page.getByRole('row').filter({ hasText: employeeName }).locator('.bi-trash').click();
    }
    async clickOnEditIcon(employeeName: string): Promise<void> {
        await this.page.getByRole('row').filter({ hasText: employeeName }).getByTitle('Edit').click();

    }
    async fillReviewasSupervvisor(reviewData: supervisorReview, today: string): Promise<void> {
        await this.rating.fill(String(reviewData.rating))
        await this.comment.fill(reviewData.comment)
        await this.generalComment.fill(reviewData.generalComment)
        await this.pickDateFromDatePicker(today, this.completionDate)
        await this.finalRating.fill(String(reviewData.rating))
        await this.finalComment.fill(reviewData.finalComment)
    }
    async clickSave(): Promise<void> {
        await this.saveBtn.click();
    }
    async clickComplete(): Promise<void> {
        await this.completeBtn.click();
    }
    async confirmReview(): Promise<void> {
        await this.okBtn.click();
    }
    verifyAccessDeniedVisibility(): Locator {
        return this.accessDeniedMsg;
    }
    async fillSearchCriteria(employeeName: string): Promise<void> {
        await this.selectEmployeeForSearch(employeeName);
    }
    async clickSearch(): Promise<void> {
        await this.searchBtn.click();
    }
    async selectEmployeeForSearch(empName: string): Promise<void> {
        await this.employeeNameInput.click();
        await this.employeeNameInput.pressSequentially(empName);
        const option = this.page.getByRole('option', { name: empName, exact: true });
        await option.waitFor({ state: 'visible', timeout: 8_000 });
        await option.click();
    }

    async validateDataInTable(employeeName: string): Promise<{ employeeName: string | null, jobTitle: string | null, period: string | null, dueDate: string | null, reviewer: string | null, status: string | null }> {
        const row = this.page.getByRole('row').filter({ hasText: employeeName });
        return {
            employeeName: await row.getByRole('cell').nth(1).textContent(),
            jobTitle: await row.getByRole('cell').nth(2).textContent(),
            period: await row.getByRole('cell').nth(3).locator('.data').textContent(),
            dueDate: await row.getByRole('cell').nth(4).textContent(),
            reviewer: await row.getByRole('cell').nth(5).textContent(),
            status: await row.getByRole('cell').nth(6).textContent(),
        };
    }

    async validateDataReadonly(): Promise<{ rating: Locator, comment: Locator, generalComment: Locator }> {
        await this.page.waitForEvent('load');
        return {
            rating: this.rating,
            comment: this.comment,
            generalComment: this.generalComment
        }
    }
    async clickYesOnDeleteConfirmation(): Promise<void> {
        await this.yesDeleteBtn.click();
    }
    validateRequiredErrors(): { employeeError: Locator, supervisorError: Locator, startDateError: Locator, endDateError: Locator, dueDateError: Locator } {
        return {
            employeeError: this.page.locator('.oxd-grid-item').filter({ hasText: 'Employee Name' }).getByText('Required', { exact: true }),
            supervisorError: this.page.locator('.oxd-grid-item').filter({ hasText: 'Supervisor Reviewer' }).getByText('Required', { exact: true }),
            startDateError: this.page.locator('.oxd-grid-item').filter({ hasText: 'Review Period Start Date' }).getByText('Required', { exact: true }),
            endDateError: this.page.locator('.oxd-grid-item').filter({ hasText: 'Review Period End Date' }).getByText('Required', { exact: true }),
            dueDateError: this.page.locator('.oxd-grid-item').filter({ hasText: 'Due Date' }).getByText('Required', { exact: true })
        }


    }
}