import { BasePage } from "../BasePage";
import { Page, Locator, expect } from "@playwright/test";


export class ManageReviews extends BasePage {

    readonly addBtn: Locator;
    readonly employeeNameInput: Locator;
    readonly supervisorNameInput: Locator;
    readonly startDate: Locator;
    readonly endDate: Locator;
    readonly dueDate: Locator;
    readonly activeBtn: Locator;

    constructor(page: Page) {
        super(page)
        this.addBtn = this.page.getByRole('button', { name: 'Add' })
        this.employeeNameInput = this.page.locator('.oxd-grid-item').filter({ hasText: /^Employee Name$/ }).locator('input')
        this.supervisorNameInput = this.page.locator('.oxd-grid-item').filter({ hasText: /^Supervisor Reviewer$/ }).locator('input')
        this.startDate = this.page.locator('.oxd-grid-item').filter({ hasText: /^Review Period Start Date$/ }).locator('input')
        this.endDate = this.page.locator('.oxd-grid-item').filter({ hasText: /^Review Period End Date$/ }).locator('input')
        this.dueDate = this.page.locator('.oxd-grid-item').filter({ hasText: /^Due Date$/ }).locator('input')
        this.activeBtn = this.page.getByRole('button', {name : 'Activate'})
    }
    async clickOnAddReview(): Promise<void> {
        await this.addBtn.click();
    }

    async fillReview(empName: string, supervisorName: string, startDate : string, endDate : string, dueDate: string): Promise<void> {
        await this.selectEmployee(empName);
        await this.selectSupervisor(supervisorName);
        await this.fillStartDate(startDate);
        await this.fillEndDate(endDate);
        await this.fillDueDate(dueDate);
    }

    async selectEmployee(empName: string): Promise<void> {
        await this.employeeNameInput.click();
        await this.employeeNameInput.pressSequentially(empName);
        const option = this.page.getByRole('option', { name: empName, exact: true });
        await option.waitFor({ state: 'visible', timeout: 8_000 });
        await option.click();
    }

    async selectSupervisor(supervisorName: string): Promise<void> {
        await this.supervisorNameInput.click();
        await this.supervisorNameInput.pressSequentially(supervisorName);
        const option = this.page.getByRole('option', { name: supervisorName, exact: true });
        await option.waitFor({ state: 'visible', timeout: 8_000 });
        await option.click();
    }

    async fillStartDate(startDate:string): Promise<void> {
        await this.pickDateFromDatePicker(startDate,this.startDate)
    }

    async fillEndDate(endDate: string): Promise<void> {
        await this.pickDateFromDatePicker(endDate,this.startDate)
    }

    async fillDueDate(dueData : string): Promise<void> {
        await this.pickDateFromDatePicker(dueData,this.startDate)
    }

    async clickActivateBtn(): Promise<void> {
        await this.activeBtn.click()
    }
}