import type { Locator, Page } from '@playwright/test';
import { BasePage } from '../BasePage';

/**
 * Dashboard (`/dashboard/index`) — the post-login landing page.
 *
 * Verified against the live app (2026-06): the breadcrumb is an <h6> "Dashboard";
 * each widget renders TWO nested `.orangehrm-dashboard-widget` nodes (outer sheet +
 * inner body), so name-filtered widget locators must tolerate >1 match — assert via
 * `.first()` for presence and `toHaveCount(0)` for absence.
 *
 * Admin widgets: Time at Work · My Actions · Quick Launch · Buzz Latest Posts ·
 * Employees on Leave Today · Employee Distribution by Sub Unit / by Location.
 * Quick Launch tiles (`.orangehrm-quick-launch-card`), Admin set: Assign Leave,
 * Leave List, Timesheets, Apply Leave, My Leave, My Timesheet.
 */
export class DashboardPage extends BasePage {
  readonly breadcrumbHeading: Locator;
  readonly widgets: Locator;
  readonly quickLaunchCards: Locator;
  readonly timeAtWorkCard: Locator;
  readonly chartCanvases: Locator;

  constructor(page: Page) {
    super(page);

    this.breadcrumbHeading = page.getByRole('heading', { name: 'Dashboard', exact: true });
    this.widgets = page.locator('.orangehrm-dashboard-widget');
    this.quickLaunchCards = page.locator('.orangehrm-quick-launch-card');
    this.timeAtWorkCard = page.locator('.orangehrm-attendance-card');
    // Scoped to the widget grid so canvases elsewhere can't skew exact-count asserts.
    this.chartCanvases = page.locator('.orangehrm-dashboard-grid canvas');
  }

  async gotoDashboard(): Promise<void> {
    await this.goto('/web/index.php/dashboard/index');
    await this.breadcrumbHeading.waitFor({ state: 'visible' });
  }

  /** Widget(s) whose body contains the given title (nested nodes → may match 2). */
  widgetByName(name: string): Locator {
    return this.widgets.filter({ hasText: name });
  }

  /**
   * A quick-launch tile by its visible title. Anchored exact match — a card's text is
   * exactly its title, and absence assertions must not match future supersets
   * (e.g. a "Leave List Report" tile when checking for "Leave List").
   */
  quickLaunchCard(title: string): Locator {
    return this.quickLaunchCards.filter({ hasText: new RegExp(`^\\s*${title}\\s*$`) });
  }

  async clickQuickLaunch(title: string): Promise<void> {
    await this.quickLaunchCard(title).first().click();
  }

  /** The My Actions widget body (first node of the nested pair). */
  myActionsWidget(): Locator {
    return this.widgetByName('My Actions').first();
  }

  /** A pending-action row/link inside My Actions (e.g. "(1) Leave Requests to Approve"). */
  myActionItem(pattern: RegExp): Locator {
    return this.myActionsWidget().getByText(pattern);
  }
}
