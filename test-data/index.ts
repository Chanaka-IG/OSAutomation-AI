/**
 * Central test data: use `api` for HTTP contracts and `frontend` for UI flows.
 *
 * @example
 * import { api, frontend } from '../test-data';
 * await postsApi.getById(api.posts.validPostId);
 * await page.goto(frontend.pim.routes.employeeList);
 */
export * as api from './api';
export * as frontend from './frontend';
