import { Page, Locator } from '@playwright/test';
import { BasePage } from '../BasePage';


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
    readonly deleteModal: Locator;
    readonly notAccessMsgLocator: Locator;

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
        this.selectAllCheckbox = page.locator('.oxd-table-header .oxd-checkbox-wrapper');
        this.deleteSelectedButton = page.getByRole('button', { name: 'Delete Selected' });
        this.yesDeleteButton = page.getByRole('button', { name: 'Yes, Delete' });
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

    async clickOnSearch(): Promise<void> {
        await this.searchButon.click();

    }

    async clickOnReset(): Promise<void> {
        await this.resetButton.click();

    }

    async validateFieldVisibility(): Promise<boolean> {
        return (
            await this.keyPerformanceIndicatorInput.isVisible() &&
            await this.jobTitleDropdown.isVisible() &&
            await this.minimumRatingInput.isVisible() &&
            await this.maximumRatingInput.isVisible() &&
            await this.makeDefaultCheckbox.isVisible() &&
            await this.saveButton.isVisible() &&
            await this.cancelButton.isVisible()
        )
    }

    async fillKeyIndicator(kpiData: { name: string; description?: string; jobTitle: string; minimumRating: string; maximumRating: string; makeDefault: boolean }): Promise<void> {
        await this.keyPerformanceIndicatorInput.fill(kpiData.name);
        await this.selectOxdOption(this.jobTitleDropdown, kpiData.jobTitle);
        await this.minimumRatingInput.fill(kpiData.minimumRating);
        await this.maximumRatingInput.fill(kpiData.maximumRating);
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

    async getRowByName(kpiName: string): Promise<Locator> {
        const row = this.page.locator('.oxd-table-card').filter({ hasText: kpiName });
        await row.waitFor({ state: 'visible' });
        return row;
    }

    async deleteKpiByName(kpiName: string): Promise<void> {
        const row = await this.getRowByName(kpiName);
        const checkbox = row.locator('.oxd-checkbox-input-icon');
        await checkbox.click();
        await this.clickDeleteSelectButton();
        await this.clickYesDeleteButton();
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
    async clickDeleteSelectButton(): Promise<void> {
        await this.deleteSelectedButton.click();
    }

    async clickYesDeleteButton(): Promise<void> {
        await this.deleteModal.waitFor({ state: 'visible' });
        await this.yesDeleteButton.click();
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