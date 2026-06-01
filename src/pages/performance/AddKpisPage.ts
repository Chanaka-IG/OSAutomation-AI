import { Page,Locator } from '@playwright/test';
import { BasePage } from '../BasePage';


export class AddKpisPage extends BasePage {

    readonly pageHeading: Locator;

    constructor(page: Page) {
        super(page);
        this.pageHeading = this.page.getByRole('heading', { name: 'Key Performance Indicators for Job Title' });
    }

    async navigateToAddKpisPage(): Promise<void> {
        await this.goto('/web/index.php/performance/searchKpi');
        await this.pageHeading.waitFor({ state: 'visible' });
    }

}



