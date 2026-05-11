/**
 * Central test data layout:
 *
 * - **`api`** — Contracts and payloads for **master-data seeding** (`src/setup/masterData`, global setup).
 *   Do **not** treat `api.*.seedRecords` as stable fixtures for Playwright assertions — those rows can change when seed jobs or admins update the instance.
 *
 * - **`frontend`** — Routes, URL patterns, and UI samples that reference **`frontendApi`** (or literals), not master seed rows.
 *
 * - **`frontendApi`** — Payloads and IDs **owned by automated tests**: add rows here and seed them in `beforeEach` / `beforeAll` via helpers under `src/setup/frontendTesting/` (e.g. `ensurePimFilterEmployees`). Assertions should use this data so tests stay deterministic even when master data changes.
 *
 * @example
 * import { frontend, frontendApi } from '../test-data';
 * await ensureEmployeeRecords(adminApi, frontendApi.pim.filterTestRecords);
 * await page.goto(frontend.pim.routes.employeeList);
 */
export * as api from './api';
export * as frontend from './frontend';
export * as frontendApi from './frontend-api';
