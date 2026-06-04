import { Page, Locator } from '@playwright/test';
import { BasePage } from '../BasePage';


export class AddKpisPage extends BasePage {

    readonly pageHeading: Locator;
    readonly keyPerformanceIndicatorInput: Locator;
    readonly jobTitleDropdown: Locator;
    readonly minimumRatingInput: Locator;
    readonly maximumRatingInput: Locator;
    readonly makeDefaultCheckbox: Locator;
    readonly saveButton: Locator;
    readonly cancelButton: Locator;
    readonly selectAllCheckbox: Locator;
    readonly deleteSelectedButton: Locator;
    readonly yesDeleteButton: Locator;
    readonly deleteModal: Locator;

    constructor(page: Page) {
        super(page);
        this.pageHeading = this.page.getByText('Add Key Performance Indicator', { exact: true });
        this.keyPerformanceIndicatorInput = page.locator('.oxd-input-group').filter({ hasText: /Key Performance Indicator/ }).locator('.oxd-input');
        this.jobTitleDropdown = page.locator('.oxd-input-group').filter({ hasText: /Job Title/ }).locator('.oxd-select-text');
        this.minimumRatingInput = page.locator('.oxd-input-group').filter({ hasText: /Minimum Rating/ }).locator('.oxd-input');
        this.maximumRatingInput = page.locator('.oxd-input-group').filter({ hasText: /Maximum Rating/ }).locator('.oxd-input');
        this.makeDefaultCheckbox = page.locator('.orangehrm-module-field-row').filter({ hasText: /Make Default Scale/ }).locator('.oxd-switch-wrapper');
        this.saveButton = page.getByRole('button', { name: 'Save' });
        this.cancelButton = page.getByRole('button', { name: 'Cancel' });
        this.selectAllCheckbox = page.locator('.oxd-table-header .oxd-checkbox-wrapper');
        this.deleteSelectedButton = page.getByRole('button', { name: 'Delete Selected' });
        this.yesDeleteButton = page.getByRole('button', { name: 'Yes, Delete' });
        this.deleteModal = page.locator('.orangehrm-dialog-popup');
    }

    async navigateToAddKpisPage(): Promise<void> {
        await this.goto('/web/index.php/performance/saveKpi');
        await this.pageHeading.waitFor({ state: 'visible' });
    }

    async validateFieldVisibility(): Promise<boolean> {
        console.log('Validating field visibility...');
        console.log('Key Performance Indicator Input visible:', await this.keyPerformanceIndicatorInput.isVisible());
        console.log('Job Title Dropdown visible:', await this.jobTitleDropdown.isVisible());
        console.log('Minimum Rating Input visible:', await this.minimumRatingInput.isVisible());
        console.log('Maximum Rating Input visible:', await this.maximumRatingInput.isVisible());
        console.log('Make Default Checkbox visible:', await this.makeDefaultCheckbox.isVisible());
        console.log('Save Button visible:', await this.saveButton.isVisible());
        console.log('Cancel Button visible:', await this.cancelButton.isVisible());
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

    async clickOnSave(): Promise<void> {
        await this.saveButton.click();
    }

    async deleteAllKpis(): Promise<void> {
        // Implement logic to delete all KPIs, e.g., by navigating to the KPI list page and deleting entries one by one
        await this.selectAllCheckbox.click();
        await this.deleteSelectedButton.click();
        await this.deleteModal.waitFor({ state: 'visible' });
        await this.yesDeleteButton.click();
    }

}