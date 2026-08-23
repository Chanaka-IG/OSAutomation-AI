import { Locator, Page } from "@playwright/test";
import { BasePage } from "../BasePage";
import { buzzData } from "../../../test-data/buzz/frontend/buzzData"

export class BuzzPage extends BasePage {

    readonly buzzMenu: Locator;
    readonly feedArea: Locator;
    readonly postBtn: Locator;
    readonly contentLocator: Locator;
    readonly yesDeleteBtn: Locator;

    constructor(page: Page) {
        super(page);
        this.buzzMenu = page.getByRole('link', { name: 'Buzz' });
        this.feedArea = page.getByPlaceholder("What's on your mind?");
        this.postBtn = page.getByRole('button', { name: 'Post', exact: true });
        this.contentLocator = page.locator('.orangehrm-buzz-newsfeed-posts').locator('.oxd-sheet');
        this.yesDeleteBtn = page.getByRole('button', { name: 'Yes, Delete' });
    }

    async gotoBuzzScreen(): Promise<void> {
        await this.page.goto(buzzData.routes.viewBuzz)
    }

    async navigateToBuzzByClickingMenu(): Promise<void> {
        await this.buzzMenu.click();
    }
    async getURL(): Promise<string> {
        return this.page.url();
    }
    async fillFeedArea(input: string): Promise<void> {
        await this.feedArea.fill(input);
        await this.page.keyboard.press('Enter');
    }
    async clickOnPostBtn(): Promise<void> {
        await this.postBtn.click();
    }
    async postVisibility(text: string): Promise<Locator> {
        return this.contentLocator.filter({ hasText: text });
    }
    async deletePost(text: string): Promise<void> {
        this.waitUntilFormLoaderDissapear();
        const post = await this.postVisibility(text);
        await post.locator('.bi-three-dots').click()
        await this.page.getByRole('listitem').filter({ hasText: /^Delete Post$/ }).click();
        await this.yesDeleteBtn.click();
    }
}
