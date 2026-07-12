import { BasePage } from "../BasePage";
import { Page, Locator } from "@playwright/test";
import type { supervisorReview, reviewForm } from '../../../test-data/performance/frontend/manageReviews'

export class ManageReviewsPage extends BasePage {

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
    readonly requiredFieldErrors: Locator;

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
        this.requiredFieldErrors = this.page.getByText('Required', { exact: true })
    }
    async clickOnAddReview(): Promise<void> {
        await this.addBtn.click();
    }

    async fillReview(review: reviewForm, startDate: string, endDate: string, dueDate: string): Promise<void> {
        await this.selectEmployee(review.employeeName);
        await this.selectSupervisor(review.supervisorSearch, review.supervisorName);
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

    async selectSupervisor(searchQuery: string, supervisorName: string): Promise<void> {
        await this.supervisorNameInput.click();
        await this.supervisorNameInput.clear();
        await this.supervisorNameInput.pressSequentially(searchQuery);
        const option = this.page.getByRole('option', { name: supervisorName, exact: true });
        await option.waitFor({ state: 'visible', timeout: 8_000 });
        await option.click();
    }

    /** Types a supervisor query and returns the resulting option list for assertions in the spec. */
    async searchSupervisorOptions(searchQuery: string): Promise<Locator> {
        await this.supervisorNameInput.click();
        await this.supervisorNameInput.pressSequentially(searchQuery);
        await this.page.getByRole('option', { name: searchQuery }).first().waitFor({ state: 'visible', timeout: 8_000 });
        return this.page.getByRole('option');
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

    reviewRow(employeeName: string): Locator {
        return this.page.getByRole('row').filter({ hasText: employeeName }).first();
    }

    /** Row matched by employee AND status — disambiguates when an employee has several reviews. */
    reviewRowWithStatus(employeeName: string, status: string): Locator {
        return this.page.getByRole('row').filter({ hasText: employeeName }).filter({ hasText: status });
    }

    reviewStatusCell(employeeName: string): Locator {
        return this.reviewRow(employeeName).getByRole('cell').nth(6);
    }

    reviewRowCells(employeeName: string): { employeeName: Locator, jobTitle: Locator, period: Locator, dueDate: Locator, reviewer: Locator, status: Locator } {
        const row = this.reviewRow(employeeName);
        return {
            employeeName: row.getByRole('cell').nth(1),
            jobTitle: row.getByRole('cell').nth(2),
            period: row.getByRole('cell').nth(3).locator('.data'),
            dueDate: row.getByRole('cell').nth(4),
            reviewer: row.getByRole('cell').nth(5),
            status: row.getByRole('cell').nth(6),
        };
    }

    async clickOnActionAsSupervisor(employeeName: string): Promise<void> {
        await this.reviewRow(employeeName).getByTitle('Evaluate').click();
    }
    async clickOnDeleteReview(employeeName: string): Promise<void> {
        await this.reviewRow(employeeName).locator('.bi-trash').click();
    }
    async clickOnEditIcon(employeeName: string): Promise<void> {
        await this.reviewRow(employeeName).getByTitle('Edit').click();
    }
    async fillReviewAsSupervisor(reviewData: supervisorReview, completionDate: string): Promise<void> {
        await this.rating.fill(String(reviewData.rating))
        await this.comment.fill(reviewData.comment)
        await this.generalComment.fill(reviewData.generalComment)
        await this.pickDateFromDatePicker(completionDate, this.completionDate)
        await this.finalRating.fill(String(reviewData.finalRating))
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

    readonlyEvaluationFields(): { rating: Locator, comment: Locator, generalComment: Locator } {
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
    async fillNameInputForInvalid(empName: string): Promise<void> {
        await this.employeeNameInput.click();
        await this.employeeNameInput.clear();
        await this.employeeNameInput.pressSequentially(empName);
        await this.page.keyboard.press('Tab');

    }
    employeeNameInvalidError(): Locator {
        return this.page.locator('.oxd-grid-item').filter({ hasText: 'Employee Name' }).getByText('Invalid', { exact: true });
    }
}
