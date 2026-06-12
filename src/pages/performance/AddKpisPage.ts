import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../BasePage';
import type { JobTitleSeed } from '../../../test-data/pim/api/jobTitles';


export class AddKpisPage extends BasePage {

    readonly pageHeadingForAddKpi: Locator;
    readonly pageHeadingForkpiList: Locator;
    readonly keyPerformanceIndicatorInput: Locator;
    readonly jobTitleDropdown: Locator;
    readonly minimumRatingInput: Locator;
    readonly maximumRatingInput: Locator;
    readonly makeDefaultCheckbox: Locator;
    readonly saveButton: Locator;
    readonly cancelButton: Locator;
    readonly searchButon: Locator
    readonly resetButton: Locator;
    readonly selectAllCheckbox: Locator;
    readonly deleteSelectedButton: Locator;
    readonly yesDeleteButton: Locator;
    readonly noCancel: Locator;
    readonly deleteModal: Locator;
    readonly notAccessMsgLocator: Locator;
    readonly addButton: Locator;

    constructor(page: Page) {
        super(page);
        this.pageHeadingForAddKpi = this.page.getByText('Add Key Performance Indicator', { exact: true });
        this.pageHeadingForkpiList = this.page.getByText('Key Performance Indicators for Job Title', { exact: true });
        this.keyPerformanceIndicatorInput = page.locator('.oxd-input-group').filter({ hasText: /Key Performance Indicator/ }).locator('.oxd-input');
        this.jobTitleDropdown = page.locator('.oxd-input-group').filter({ hasText: /Job Title/ }).locator('.oxd-select-text');
        this.minimumRatingInput = page.locator('.oxd-input-group').filter({ hasText: /Minimum Rating/ }).locator('.oxd-input').nth(0);
        this.maximumRatingInput = page.locator('.oxd-input-group').filter({ hasText: /Maximum Rating/ }).locator('.oxd-input').nth(0);
        this.makeDefaultCheckbox = page.locator('.orangehrm-module-field-row').filter({ hasText: /Make Default Scale/ }).locator('.oxd-switch-wrapper');
        this.saveButton = page.getByRole('button', { name: 'Save' });
        this.cancelButton = page.getByRole('button', { name: 'Cancel' });
        this.addButton = page.getByRole('button', { name: 'Add' });
        this.selectAllCheckbox = page.locator('.oxd-table-header .oxd-checkbox-wrapper');
        this.deleteSelectedButton = page.getByRole('button', { name: 'Delete Selected' });
        this.yesDeleteButton = page.getByRole('button', { name: 'Yes, Delete' });
        this.noCancel = page.getByRole('button', { name: 'No, Cancel' })
        this.searchButon = page.getByRole('button', { name: 'Search' });
        this.resetButton = page.getByRole('button', { name: 'Reset' });
        this.deleteModal = page.locator('.orangehrm-dialog-popup');
        this.notAccessMsgLocator = page.getByText('Credential Required', { exact: true });
    }

    async navigateToAddKpisPage(): Promise<void> {
        await this.goto('/web/index.php/performance/saveKpi');
        await this.pageHeadingForAddKpi.waitFor({ state: 'visible' });
    }
    async navigateToAddKpisPageasESS(): Promise<void> {
        await this.goto('/web/index.php/performance/saveKpi');
    }

    async navigateToSearchPage(): Promise<void> {
        await this.goto('/web/index.php/performance/searchKpi');
        await this.pageHeadingForkpiList.waitFor({ state: 'visible' });
    }

    async clickOnAdd(): Promise<void> {
        await this.addButton.click();
    }

    async clickOnSearch(): Promise<void> {
        await this.searchButon.click();

    }
    async clickOnReset(): Promise<void> {
        await this.resetButton.click();

    }

    async expectFieldsVisible(): Promise<void> {
        await expect(this.keyPerformanceIndicatorInput).toBeVisible();
        await expect(this.jobTitleDropdown).toBeVisible();
        await expect(this.minimumRatingInput).toBeVisible();
        await expect(this.maximumRatingInput).toBeVisible();
        await expect(this.makeDefaultCheckbox).toBeVisible();
        await expect(this.saveButton).toBeVisible();
        await expect(this.cancelButton).toBeVisible();
    }

    async fillKeyIndicator(kpiData: { name: string; description?: string; jobTitle: string; minimumRating: string; maximumRating: string; makeDefault: boolean | undefined }): Promise<void> {
        if (kpiData.name !== "") {
            await this.keyPerformanceIndicatorInput.fill(kpiData.name);
        }
        if (kpiData.jobTitle !== "") {
            await this.selectOxdOption(this.jobTitleDropdown, kpiData.jobTitle);
        }
        if (kpiData.minimumRating !== "") {
            await this.minimumRatingInput.fill(kpiData.minimumRating);
        }
        if (kpiData.maximumRating !== "") {
            await this.maximumRatingInput.fill(kpiData.maximumRating);
        }
        if (kpiData.makeDefault !== undefined) {
            if (kpiData.makeDefault) {
                const isChecked = await this.makeDefaultCheckbox.locator('input').isChecked();
                if (!isChecked) {
                    await this.makeDefaultCheckbox.click();
                }
            } else {
                const isChecked = await this.makeDefaultCheckbox.locator('input').isChecked();
                if (isChecked) {
                    await this.makeDefaultCheckbox.click();
                }
            }
        }

    }

    async expectInlineMsg(validationMsg: string): Promise<void> {
        await expect(this.page.getByText(validationMsg, { exact: true })).toBeVisible();
    }

    async isRowExists(kpiName: string): Promise<void> {
        await expect (this.page.locator('.oxd-table-card').filter({ hasText: kpiName })).toBeVisible();
    }

    private getRowByName(kpiName: string): Locator {
        return this.page.locator('.oxd-table-card').filter({ hasText: kpiName });
    }

    async deleteKpiByName(kpiName: string): Promise<void> {
        const row = this.getRowByName(kpiName);
        const checkbox = row.locator('.oxd-checkbox-input-icon');
        await checkbox.click();
        await this.clickDeleteSelectButton();
        await this.clickYesDeleteButton();
    }

    async CancelDeleteKpiByName(kpiName: string): Promise<void> {
        const row = await this.getRowByName(kpiName);
        const checkbox = row.locator('.oxd-checkbox-input-icon');
        await checkbox.click();
        await this.clickDeleteSelectButton();
        await this.clickNoCancel();
    }

    async editKpiByName(kpiName: string): Promise<void> {
        const row = await this.getRowByName(kpiName);
        const deleteIcon = row.locator('.bi-pencil-fill');
        await deleteIcon.click();
        await this.waitUntilFormLoaderDissapear();
    }

    async filterByJobTitle(kpiName: string): Promise<void> {
        await this.selectOxdOption(this.jobTitleDropdown, kpiName);
    }

    async validateJobTitileDropDown(systemJobTitles: string[]): Promise<boolean> {
        const jobDropDownValues = await this.getOxdDropdownOptions(this.jobTitleDropdown);
        const checkMatch = systemJobTitles.every(d => jobDropDownValues.includes(d))
        return checkMatch;

    }

    async clickDeleteSelectButton(): Promise<void> {
        await this.deleteSelectedButton.click();
    }

    async clickYesDeleteButton(): Promise<void> {
        await this.deleteModal.waitFor({ state: 'visible' });
        await this.yesDeleteButton.click();
    }

    async clickNoCancel(): Promise<void> {
        await this.deleteModal.waitFor({ state: 'visible' });
        await this.noCancel.click();
    }

    async clickOnSave(): Promise<void> {
        await this.saveButton.click();
    }


    async getDefaultText(): Promise<string | null> {
        return await this.jobTitleDropdown.textContent();
    }


    async deleteAllKpis(): Promise<void> {
        // Implement logic to delete all KPIs, e.g., by navigating to the KPI list page and deleting entries one by one
        await this.selectAllCheckbox.click();
        await this.deleteSelectedButton.click();
        await this.deleteModal.waitFor({ state: 'visible' });
        await this.yesDeleteButton.click();
    }
    async notAccessMsg(): Promise<boolean> {
        // Implement logic to delete all KPIs, e.g., by navigating to the KPI list page and deleting entries one by one
        return await this.notAccessMsgLocator.isVisible();
    }

}