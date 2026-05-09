import type { Locator, Page } from '@playwright/test';

export abstract class BasePage {
  constructor(public readonly page: Page) {}

  /** Relative paths use `baseURL` from playwright.config; absolute URLs work as-is. */
  async goto(urlOrPath: string): Promise<void> {
    await this.page.goto(urlOrPath);
  }

  protected locator(selector: string): Locator {
    return this.page.locator(selector);
  }
}
