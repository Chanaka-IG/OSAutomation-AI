import { test, expect } from '../../src/fixtures/apiAction';
import { env } from '../../src/config/env';
import { frontend } from '../../test-data';
import { api } from '../../test-data';

test.describe.configure({ timeout: 90_000 });

test.beforeEach(() => {
    test.skip(!env.baseURL, 'Set BASE_URL to run this suite.');
});


test.beforeAll(async ({ masterDataReadiness, orangehrmAdminApi, employees, users }) => {
    test.setTimeout(120_000);

    void masterDataReadiness;
    await orangehrmAdminApi.loginAsAdmin();
    for (const employee of api.reviewData.apiEmployees) {
        await employees.createIfAbsent(employee)
    }

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
})

test.describe("Test cases for Manage reviews", () => {

    test("Add reviews", async ({ page, manageReviews }) => {

        const base = new Date();
        const format = (d: Date): string => d.toISOString().split('T')[0];

        const today = new Date();

        const twoWeeksBefore = new Date(base);
        twoWeeksBefore.setDate(base.getDate() - 14);
        const startDate = format(twoWeeksBefore)

        const twoWeeksAfter = new Date(base);
        twoWeeksAfter.setDate(base.getDate() + 14);
        const endDate = format(twoWeeksAfter)

        const oneMonthAfter = new Date(base);
        oneMonthAfter.setMonth(base.getMonth() + 1);
        const dueDate = format(oneMonthAfter)
        await manageReviews.loginAs('admin')
        await page.goto(frontend.manageReviewData.routes.manageReviews)
        await manageReviews.clickOnAddReview();
        await manageReviews.fillReview(frontend.manageReviewData.reviewData[0].employeeName, frontend.manageReviewData.reviewData[0].supervisorName,startDate,endDate,dueDate);
        await manageReviews.clickActivateBtn();
        await manageReviews.verifySuccessToastForActivate();
    })



})