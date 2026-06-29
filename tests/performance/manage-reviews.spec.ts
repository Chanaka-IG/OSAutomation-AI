import { test, expect } from '../../src/fixtures/apiAction';
import { env } from '../../src/config/env';
import { frontend } from '../../test-data';
import { api } from '../../test-data';
import { manageReviews } from '../../test-data/performance/frontend/manageReviews';

test.describe.configure({ timeout: 120_000 });

test.beforeEach(() => {
    test.skip(!env.baseURL, 'Set BASE_URL to run this suite.');
});


test.beforeAll(async ({ masterDataReadiness, orangehrmAdminApi, employees, users, assignDerectSupervisors, jobTitle, kpi, assignJobTitles }) => {
    test.setTimeout(120_000);

    void masterDataReadiness;
    await orangehrmAdminApi.loginAsAdmin();
    for (const employee of api.reviewData.apiEmployees) {
        await employees.createIfAbsent(employee)
    }

    await jobTitle.createIfAbsent(frontend.manageReviewData.jobTitle);
    const jobTitleID = await jobTitle.getJobTitleIDbyName(frontend.manageReviewData.jobTitle.title);

    const kpiForJobTitle = {
        title: 'KPI for manage review tests',
        minRating: 25,
        maxRating: 50,
        jobTitleId: jobTitleID,
        isDefault: false,
    }
    await kpi.createIfAbsent(kpiForJobTitle);

    const supervisorEmpNumber = await employees.getEmpNumberByEmployeeId(api.reviewData.apiEmployees[0].employeeId);

    if (supervisorEmpNumber !== undefined) {
        await users.createIfAbsent({
            username: api.reviewData.apiEmployees[0].username,
            password: api.reviewData.apiEmployees[0].password,
            status: api.reviewData.apiEmployees[0].status,
            userRoleId: api.reviewData.apiEmployees[0].userRoleId,
            empNumber: supervisorEmpNumber
        });
    }

    const essEmpNumber = await employees.getEmpNumberByEmployeeId(api.reviewData.apiEmployees[1].employeeId);

    if (essEmpNumber !== undefined) {
        await users.createIfAbsent({
            username: api.reviewData.apiEmployees[1].username,
            password: api.reviewData.apiEmployees[1].password,
            status: api.reviewData.apiEmployees[1].status,
            userRoleId: api.reviewData.apiEmployees[1].userRoleId,
            empNumber: essEmpNumber
        });
    }
    await assignDerectSupervisors.createSupervisors(essEmpNumber, supervisorEmpNumber);
    await assignJobTitles.assignJobTitles(essEmpNumber, jobTitleID, frontend.manageReviewData.jobTitle.title);
})

// test.afterAll(async ({manageReview, orangehrmAdminApi}) => {
//     await orangehrmAdminApi.loginAsAdmin();
//     await manageReview.deleteAllReviews();
// })


test.describe("Test cases for Manage reviews", () => {

    test("Add reviews", async ({ page, manageReviews }) => {

        const base = new Date();
        const format = (d: Date): string => d.toISOString().split('T')[0];

        const today = format(base);

        const twoWeeksBefore = new Date(base);
        twoWeeksBefore.setDate(base.getDate() - 14);
        const startDate = format(twoWeeksBefore)

        const twoWeeksAfter = new Date(base);
        twoWeeksAfter.setDate(base.getDate() + 14);
        const endDate = format(twoWeeksAfter)

        const oneMonthAfter = new Date(base);
        oneMonthAfter.setMonth(base.getMonth() + 1);
        const dueDate = format(oneMonthAfter)

        //actions as admin
        await manageReviews.loginAs('admin')
        await page.goto(frontend.manageReviewData.routes.manageReviews)
        await manageReviews.clickOnAddReview();
        await manageReviews.fillReview(frontend.manageReviewData.reviewData.employeeName, frontend.manageReviewData.reviewData.supervisorName, startDate, endDate, dueDate);
        await manageReviews.clickActivateBtn();
        await manageReviews.verifySuccessToastForActivate();
        expect(await manageReviews.checkReviewStatusAsAdmin(frontend.manageReviewData.validateData.employeeName)).toBe(frontend.manageReviewData.validateData.reviewStatus);
        await manageReviews.logOut();

        //action as supervisor
        await manageReviews.loginWithCredentials(frontend.manageReviewData.logasSupervisor.username, frontend.manageReviewData.logasSupervisor.password);
        await page.goto(frontend.manageReviewData.routes.reviewsAsSupervisor)
        await manageReviews.clickOnActionAsSupervisor(frontend.manageReviewData.validateData.employeeName)
        await manageReviews.fillReviewasSupervvisor(frontend.manageReviewData.supervisorReview, today);
        await manageReviews.clickSave();
        await manageReviews.verifySuccessToastForSave();
        await manageReviews.clickComplete();
        await manageReviews.confirmReview();
        await manageReviews.verifySuccessToastForSave();

    })
})