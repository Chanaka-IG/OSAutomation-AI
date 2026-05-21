---
name: playwright-best-practices
description: Playwright E2E test automation standards — locator strategy, assertion patterns, test structure, POM, API mocking, auth patterns, wait strategies, and anti-patterns. Use when writing, reviewing, or debugging Playwright tests.
user-invocable: false
---

# Playwright Test Automation Best Practices for EventHub

## Overview
This document defines the testing standards, patterns, and best practices for writing Playwright E2E tests in the EventHub project. All test automation agents and code reviewers MUST follow these guidelines.

---

## 1. Project Test Setup

### Config Reference
- **Test directory**: `./tests`
- **Base URL**: `https://automationtest-os-kord.orangehrm.com/web/index.php/auth/login`
- **Timeout**: 30s per test, 5s per assertion
- **Browser**: Chromium only (Desktop Chrome)
- **Parallel execution**: Disabled (`fullyParallel: false`)
- **Reporter**: HTML
- **Screenshots**: Only on failure
- **Video**: Retain on failure

### File Naming Convention
- Test files: `tests/<feature-name>.spec.js`
- Use descriptive kebab-case names: `booking-flow.spec.js`, `cross-user-booking.spec.js`
- Group related tests in the same file using `test.describe()`

---

## 2. Locator Strategy (Priority Order)

Always choose locators in this priority order for reliability and readability:

### Priority 1: Accessibility Roles
```javascript
page.getByRole('link', { name: 'Browse Events ->' })
page.getByRole('button', { name: 'Submit' })
```
Use for: anything with semantic HTML roles.

### Priority 2: Labels and Placeholders
```javascript
page.getByLabel('Full Name')
page.getByLabel('Username')
page.getByPlaceholder('you@email.com')
page.getByPlaceholder('Type for hints...')
```
Use for: Form inputs that have associated labels or placeholder text.

### Priority 3: Element IDs
```javascript
page.locator('#login-btn')
page.locator('#event-title-input')
page.locator('#customer-email')
page.locator('#check-refund-btn')
```
Use for: Elements with explicit, stable IDs. Prefer `getByTestId` over raw IDs.

### Priority 5: CSS Classes (Last Resort)
```javascript
page.locator('.confirm-booking-btn')
page.locator('.booking-ref')
```
Use for: Only when no better locator exists. Classes can change with styling.

### Priority 5: Xpath selectors
```javascript
page.locator('//button[@id="login-btn"]')
page.locator('//input[@id="event-title-input"]')
```
Use for: Only when no better locator exists. 

### Use exact text match for reliability
```javascript
-page.getByText(jobData.subUnit, { exact: true })  // Exact match

Use for : Any text-based locator. Avoid partial matches to prevent false positives.
```


### NEVER Use
- Complex CSS chains (`.parent > .child:nth-child(3)`)
- Index-based selectors without filtering


---

## 3. Filtering and Scoping Patterns

### Filter cards by content
```javascript
const eventCards = page.getByTestId('event-card');
const targetCard = eventCards.filter({ hasText: eventTitle }).first();
```

### Filter by nested element
```javascript
const matchingCard = bookingCards.filter({
  has: page.locator('.booking-ref', { hasText: bookingRef })
});
```

### Scope actions to a parent
```javascript
await targetCard.getByTestId('book-now-btn').click();
```

---

## 4. Assertion Patterns

### Visibility Checks
```javascript
await expect(page.getByText('Event created!')).toBeVisible();
await expect(banner).not.toBeVisible();
```

### URL Assertions
```javascript
await expect(page).toHaveURL(`${BASE_URL}/bookings`);
await expect(page).toHaveURL(/\/events\/\d+/);  // Regex for dynamic IDs
```

### Content Assertions
```javascript
await expect(result).toContainText('Eligible for refund');
await expect(matchingCard).toContainText(eventTitle);
```

### Numeric/Value Assertions
```javascript
expect(await eventCards.count()).toBe(6);
expect(seatsAfterBooking).toBe(seatsBeforeBooking - 1);
```

### Custom Timeout for Slow Operations
```javascript
await expect(targetCard).toBeVisible({ timeout: 5000 });
await expect(page.locator('#refund-spinner')).not.toBeVisible({ timeout: 6000 });
```

---

## 5. Test Structure Patterns

### Standard Test Structure
```javascript
refer automation-framework
```

### Multi-Step Test with Comments
Use `// -- Step N: Description --` comment blocks to separate logical steps:
```javascript
test('create event, book it, verify seats', async ({ page }) => {
  // -- Step 1: Log in --
  await login(page);

  // -- Step 2: Create event --
  // ... actions ...

  // -- Step 3: Book the event --
  // ... actions ...

  // -- Step 4: Verify seat reduction --
  // ... assertions ...
});
```

### Page Object Model (POM)

For larger test suites, extract page interactions into reusable page classes:

```javascript
// pages/LoginPage.js
class LoginPage {
  constructor(page) {
    this.page = page;
    this.emailInput = page.getByPlaceholder('you@email.com');
    this.passwordInput = page.getByLabel('Password');
    this.loginBtn = page.locator('#login-btn');
  }

  async goto() {
    await this.page.goto(`${BASE_URL}/login`);
  }

  async login(email, password) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginBtn.click();
  }
}
```

```javascript
// In test file
const loginPage = new LoginPage(page);
await loginPage.goto();
await loginPage.login(USER_EMAIL, USER_PASSWORD);
```

**POM Rules:**
- One page class per page/major component
- Store locators as class properties in the constructor
- Methods represent user actions, not low-level steps
- Keep assertions in test files, not in page objects
- Page files live in `tests/pages/` directory

---

## 6. API Mocking (Route Interception)

### When to Mock
- Testing UI behavior for specific data states (e.g., empty list, exact count)
- Testing conditional UI elements (banners, feature flags)
- Isolating frontend logic from backend state

### Pattern
```javascript
await page.route('**/api/events**', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(mockedResponse),
  });
});
```

### Mock Data
Define mock responses as constants at the top of the file:
```javascript
const SIX_EVENTS_RESPONSE = {
  data: [...],
  pagination: { page: 1, totalPages: 1, total: 6, limit: 12 },
};
```

---

```

### Test Users
| User          | Email                       | Password    | Purpose          |
|---------------|----------------------------|-------------|------------------|
| Gmail User    | rahulshetty1@gmail.com     | Magiclife1! | Primary tester   |
| Yahoo User    | rahulshetty1@yahoo.com     | Magiclife1! | Cross-user tests |

---

## 8. Dynamic Data Handling

### Unique Test Data
Generate unique data to avoid test pollution:
```javascript
const eventTitle = `Test Event ${Date.now()}`;
```



## 9. Wait Strategies

### DO: Use auto-waiting with expect
```javascript
await expect(page.getByText('Event created!')).toBeVisible();  // Auto-waits
```

### DO: Use waitUntil for navigation
```javascript
await page.goto(`${BASE_URL}/bookings/${id}`, { waitUntil: 'networkidle' });
```

### DO: Use waitFor for screen stability before assertions
```javascript
await page.getByRole('button', { name: 'Book Event' }).waitFor({ state: 'visible' });
```

### DO: Use loader dissapear options
- use `waitUntilTableLoaderDissapear` for table loading
- use `waitUntilFormLoaderDissapear` for form loading
- These are predefined in BasePage and should be used whenever applicable to ensure the page is fully loaded before interacting or asserting.


### DON'T: Use arbitrary sleeps
```javascript
// BAD - Never do this
await page.waitForTimeout(2000);
```

### DO: Use waitUntil for navigation
```javascript
await page.goto(`${BASE_URL}/bookings/${id}`, { waitUntil: 'networkidle' });
```

---

### Common Test Validation
- If there is a test element validation seems like common thing for other test as well (Example - Validate sucess message, Error message, Wait until spinner disappears), add them in to BasePage and reuse them in other tests. This will reduce the code duplication and make the test more maintainable.


## 10. Debugging Tips

### use Logger options in test.describe to log the test steps and data
-For any logger purpose always use Logger utility from automation-framework skill, it will provide you with more options and flexibility to log the data in a structured way.

```javascript

### Run Single Test
```bash
npx playwright test tests/booking-flow.spec.js --reporter=line
```

### Run with UI Mode
```bash
npx playwright test --ui
```

### View HTML Report
```bash
npx playwright show-report
```

---

## 11. Anti-Patterns to Avoid

| Anti-Pattern | Why It's Bad | Do Instead |
|-------------|-------------|-----------|
| `page.waitForTimeout(N)` | Flaky, wastes time | Use `expect().toBeVisible()` |
| `page.locator('div > span:nth-child(2)')` | Fragile CSS path | Use `data-testid` |
| Hardcoded booking/event IDs | Tests break when DB changes | Generate data dynamically |
| `test.only()` left in code | Skips other tests in CI | Remove before commit |
| No assertions after every action | Test passes but proves nothing | Always assert outcomes |
| Shared state between tests | Order-dependent failures | Each test self-contained |
| Testing implementation details | Breaks on refactor | Test user-visible behavior |


