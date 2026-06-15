import { env } from '../../../src/config/env';

/**
 * UI strings, routes, and API paths for Time → Project Info → Projects tests.
 * Verified live via Playwright MCP against OrangeHRM OS 5.8 (2026-06-14).
 */
export const projects = {
  routes: {
    list: '/web/index.php/time/viewProjects',
    add: '/web/index.php/time/saveProject',
  },
  urlPatterns: {
    list: /time\/viewProjects$/i,
    add: /time\/saveProject$/i,
    edit: /time\/saveProject\/\d+$/i,
    login: /auth\/login/i,
  },
  /** API v2 paths (host = `env.baseURL`). */
  apiPaths: {
    projects: '/web/index.php/api/v2/time/projects',
    customers: '/web/index.php/api/v2/time/customers',
  },
  get apiBaseUrl(): string {
    return env.baseURL.replace(/\/$/, '');
  },
  headings: {
    list: 'Projects',
    add: 'Add Project',
    edit: 'Edit Project',
    activities: 'Activities',
    addCustomer: 'Add Customer',
  },
  messages: {
    required: 'Required',
    alreadyExists: 'Already exists',
    credentialRequired: 'Credential Required',
    successToast: 'Successfully Saved',
  },
  deleteDialog: {
    title: 'Are you Sure?',
    confirm: 'Yes, Delete',
    cancel: 'No, Cancel',
  },
  samples: {
    namePrefix: 'PIO Project',
    customerPrefix: 'PIO Customer',
    whitespaceName: '   ',
  },
} as const;
