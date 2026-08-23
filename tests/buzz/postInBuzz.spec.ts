import { test, expect } from '../../src/fixtures';
import { env } from '../../src/config/env';
import { auth } from '../../test-data/auth';
import { frontend } from '../../test-data';
import { api } from '../../test-data';

import { EmployeesApi } from '../../src/api/orangehrmOSAPI/EmployeesApi';
import { BuzzApi } from '../../src/api/orangehrmOSAPI/BuzzApi';


test.describe.configure({ timeout: 120_000 });

test.beforeEach(async ({ loginPage }) => {
    test.skip(!env.baseURL, 'Set BASE_URL to run this suite.');
})

test.describe("Post publiching relatedt test cases with admin role", () => {

    test.beforeAll(async ({ orangehrmAdminApi }) => {
        await orangehrmAdminApi.loginAsAdmin();
        const employeesApi = new EmployeesApi(orangehrmAdminApi.request);
        const buzzApi = new BuzzApi(orangehrmAdminApi.request);
        const employeeList = api.buzzData.seedRecords;
        for (const emp of employeeList) {
            await employeesApi.createIfAbsent(emp);
        }
        const postList = api.buzzData.postRecords;
        for (const post of postList) {
            await buzzApi.postBuzzFeedIfAbsent(post);
        }
    })

    test.beforeEach(async ({ buzzPage }, testInfo) => {
        if (testInfo.title === 'Admin opens Buzz from the main menu; composer + feed render') {
            return;
        }
        await buzzPage.loginAs('admin');
        await buzzPage.navigateToBuzzByClickingMenu();
    })


    test("Admin opens Buzz from the main menu; composer + feed render", async ({ buzzPage }) => {
        await buzzPage.loginAs('admin');
        await buzzPage.navigateToBuzzByClickingMenu();
        const url = await buzzPage.getURL();
        expect(url).toBe(frontend.buzz.fullUrl.viewBuzz);
    });

    test("Create a text (status) post appears at top of feed", async ({ buzzPage }) => {
        await buzzPage.fillFeedArea(frontend.buzz.fillNewsFeedWithText.text);
        await buzzPage.clickOnPostBtn();
        await buzzPage.verifySuccessToastForSave();
        await expect(await buzzPage.postVisibility(frontend.buzz.fillNewsFeedWithText.text)).toBeVisible();
    })


    test("Delete own post removes it permanently from the feed", async ({ buzzPage }) => {
        await buzzPage.deletePost(api.buzzData.postRecords[0].text);
        await buzzPage.verifySuccessToastforDeletion();
        await expect(await buzzPage.postVisibility(api.buzzData.postRecords[0].text)).not.toBeVisible();
    })

    test.only("TC-206 | J8 | XSS payloads in comments and reshare text render inert", async ({ buzzPage }) => {
        await buzzPage.fillFeedArea(frontend.buzz.fillNewsFeedWithXss.text);
        await buzzPage.clickOnPostBtn();
        await buzzPage.verifySuccessToastForSave();
        await expect(await buzzPage.postVisibility(frontend.buzz.fillNewsFeedWithXss.text)).toBeVisible();
    })

});       

test.describe("Post publiching relatedt test cases with ESS role", () => {

    test.beforeEach(async ({ buzzPage }, testInfo) => {
        await buzzPage.loginAs('ess');
        await buzzPage.navigateToBuzzByClickingMenu();
    })

    test("ESS opens Buzz from the main menu; composer + feed render", async ({ buzzPage }) => {
        await buzzPage.loginAs('ess');
        await buzzPage.navigateToBuzzByClickingMenu();
        const url = await buzzPage.getURL();
        expect(url).toBe(frontend.buzz.fullUrl.viewBuzz);
    });

});
