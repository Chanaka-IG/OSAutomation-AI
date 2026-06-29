import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import type { LoginRole } from '../../test-data/auth';
import { auth } from '../../test-data/auth';

export abstract class BasePage {
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly tableLoader: Locator
  readonly formLoader: Locator;
  readonly dropdownFirstOption: Locator;
  readonly successToastContent: Locator;
  readonly successHeader: Locator;
  readonly noRecordsHeader: Locator;
  readonly errorHeader: Locator;
  readonly successToastMsgForSave: Locator;
  readonly successToastMsgForActivate: Locator;
  readonly noRecordsToastMsg: Locator;
  readonly successToastMsgForDelete: Locator;
  readonly successToastMsgForUpdate: Locator;
  readonly celenderPicker: Locator;
  readonly monthDropDownIcon: Locator;
  readonly monthDropDownList: Locator;
  readonly yearDropDownIcon: Locator;
  readonly yearDropDownList: Locator;
  readonly dateContent: Locator;
  readonly logoutArea: Locator;
  readonly logoutLink: Locator;

  constructor(public readonly page: Page) {
    this.usernameInput = page.locator('input[name="username"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.loginButton = page.getByRole('button', { name: 'Login' });
    this.tableLoader = page.locator('.oxd-table-loader');
    this.formLoader = page.locator('.oxd-loading-spinner');
    this.dropdownFirstOption = page.getByRole('option', { name: '-- Select --' })
    this.successToastContent = this.page.locator("#oxd-toaster_1")
    this.successHeader = this.page.getByText("Success", { exact: true })
    this.noRecordsHeader = this.page.getByText("Info", { exact: true })
    this.errorHeader = this.page.getByText("Error", { exact: true })
    this.successToastMsgForSave = this.page.getByText("Successfully Saved", { exact: true })
    this.noRecordsToastMsg = this.page.locator(".oxd-text--toast-message")
    this.successToastMsgForDelete = this.page.getByText("Successfully Deleted", { exact: true })
    this.successToastMsgForUpdate = this.page.getByText("Successfully Updated", { exact: true })
    this.successToastMsgForActivate = page.getByText("Successfully Activated", { exact: true })
    this.celenderPicker = page.locator(".oxd-date-input-calendar")
    this.monthDropDownIcon = page.locator('.oxd-icon.bi-caret-down-fill.oxd-icon-button__icon').first()
    this.monthDropDownList = page.locator('.oxd-calendar-selector-month ul')
    this.yearDropDownIcon = page.locator(".oxd-icon.bi-caret-down-fill.oxd-icon-button__icon").nth(1)
    this.yearDropDownList = page.locator('.oxd-calendar-selector-year ul')
    this.dateContent = page.locator(".oxd-calendar-dates-grid")
    this.logoutArea = page.locator('.oxd-userdropdown-tab')
    this.logoutLink = page.getByRole('menuitem', {name: 'Logout'})
  }

  /** Relative paths use `baseURL` from automation.config; absolute URLs work as-is. */
  async goto(urlOrPath: string): Promise<void> {
    await this.page.goto(urlOrPath, { waitUntil: 'domcontentloaded' });
  }

  protected locator(selector: string): Locator {
    return this.page.locator(selector);
  }

  /** Left side-nav (OXD main menu) item matched by its visible label. */
  mainMenuItem(name: string): Locator {
    return this.page.locator('.oxd-main-menu-item').filter({ hasText: name });
  }

  async waitForSuccessToast(timeout = 10_000): Promise<string> {
    const toast = this.page.locator('.oxd-toast--success');
    await toast.waitFor({ state: 'visible', timeout });
    return (await toast.innerText()).trim();
  }


  async verifySuccessToastForSave(): Promise<void> {
    await this.successToastContent.waitFor({ state: 'visible' }).then(async () => {
      await test.expect(this.successHeader).toBeVisible();
      await test.expect(this.successToastMsgForSave).toBeVisible();
    })

  }

  async VerifyNoRecords(): Promise<void> {
    await this.successToastContent.waitFor({ state: 'visible' }).then(async () => {
      await test.expect(this.noRecordsHeader).toBeVisible();
      await expect(this.noRecordsToastMsg).toHaveText("No Records Found");
    })
  }

  async verifySuccessToastForUpdate(): Promise<void> {

    await this.successToastContent.waitFor({ state: 'visible' }).then(async () => {
      await test.expect(this.successHeader).toBeVisible();
      await test.expect(this.successToastMsgForUpdate).toBeVisible();
    })

  }

  async verifySuccessToastforDeletion(): Promise<void> {

    await this.successToastContent.waitFor({ state: 'visible' }).then(async () => {
      await test.expect(this.successHeader).toBeVisible();
      await test.expect(this.successToastMsgForDelete).toBeVisible();
    })

  }

  async verifyCustomToast(toastContent: string): Promise<void> {
    await this.successToastContent.waitFor({ state: 'visible' }).then(async () => {
      await test.expect(this.successHeader).toBeVisible();
      await expect(this.page.getByText(toastContent, { exact: true })).toBeVisible();
    })

  }

  async verifyCustomToastforError(toastContent: string): Promise<void> {
    await this.successToastContent.waitFor({ state: 'visible' }).then(async () => {
      await test.expect(this.errorHeader).toBeVisible();
      await expect(this.page.getByText(toastContent, { exact: true })).toBeVisible();
    })
  }

  async verifySuccessToastForActivate(): Promise<void> {
    await this.successToastContent.waitFor({ state: 'visible' }).then(async () => {
      await test.expect(this.successHeader).toBeVisible();
      await test.expect(this.successToastMsgForActivate).toBeVisible();
    })

  }

  async loginAs(role: LoginRole): Promise<void> {
    const { username, password } = auth.getCredentials(role);
    if (!username || !password) {
      throw new Error(
        `Missing credentials for role "${role}". Configure the OHRM_* / ADMIN_* environment variables.`,
      );
    }
    await this.loginWithCredentials(username, password);
  }

  async logOut(): Promise<void> {
    await this.logoutArea.click();
    await this.logoutLink.click();
  }

  /**
   * Log in with explicit credentials (for dynamically-seeded users not covered by the
   * env-configured roles, e.g. a per-suite ESS account). Clears existing cookies first so
   * it can switch users mid-test, and waits until the app navigates off the login page.
   */
  async loginWithCredentials(username: string, password: string): Promise<void> {
    if (!username || !password) {
      throw new Error('loginWithCredentials requires a non-empty username and password.');
    }
    await this.page.context().clearCookies();
    await this.page.goto(auth.routes.login, { waitUntil: 'domcontentloaded' });
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    await this.page.waitForURL((url) => !url.pathname.includes('/auth/login'), {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
  }

  async waitUntilTableLoaderDissapear(): Promise<void> {

    try {
      await this.tableLoader.waitFor({ state: 'visible', timeout: 2000 });
      await this.tableLoader.waitFor({ state: 'detached' });
    }
    catch {
      //ignore silently if the loader did not appear rather than failing the test, as in some cases the loader may not appear based on the response time of the application
    }
  }

  async waitUntilMultipleTableLoaderDissapear(): Promise<void> {
    const loaders = this.page.locator('.oxd-table-loader');
    await expect(loaders).toHaveCount(0);
  }

  async waitUntilFormLoaderDissapear(): Promise<void> {
    try {
      await this.formLoader.waitFor({ state: 'visible', timeout: 2000 });
      await this.formLoader.waitFor({ state: 'hidden' });
    }
    catch {
      //ignore silently if the loader did not appear rather than failing the test, as in some cases the loader may not appear based on the response time of the application
    }

  }
  async selectOxdOption(dropdown: Locator, optionText: string): Promise<void> {
    await dropdown.click();
    await this.page.getByRole('option', { name: optionText, exact: true }).click();
  }

  async getOxdDropdownOptions(dropdown: Locator): Promise<string[]> {
    await dropdown.click();
    await this.dropdownFirstOption.waitFor({ state: 'visible', timeout: 3000 })
    const jobTitles = await this.page
      .getByRole('option')
      .allTextContents();

    jobTitles.shift();
    return jobTitles.map(text => text.trim());
  }

  async pickDateFromDatePicker(inputDate: string, dateField: Locator,): Promise<void> {
    const [year, month, day] = inputDate.split('-');
    const monthMap: Record<string, string> = {
      "01": 'January',
      "02": 'February',
      "03": 'March',
      "04": 'April',
      "05": 'May',
      "06": 'June',
      "07": 'July',
      "08": 'August',
      "09": 'September',
      "10": 'October',
      "11": 'November',
      "12": 'December',
    };
    await dateField.click();
    await this.celenderPicker.waitFor({ state: 'visible' })
    await this.monthDropDownIcon.click();
    await this.monthDropDownList.getByText(monthMap[month], { exact: true }).click();
    await this.yearDropDownIcon.click();
    await this.yearDropDownList.getByText(year, { exact: true }).click();
    await this.dateContent.getByText(String(Number(day)), { exact: true }).click();
    await this.celenderPicker.waitFor({ state: 'detached' })
  }
}

