/** UI strings, routes, and form values for Admin → Job → Job Titles tests. */

import path from 'path';

const FILES_DIR = path.join(__dirname, '../../files');

export const adminJobTitles = {
  routes: {
    list: '/web/index.php/admin/viewJobTitleList',
    add: '/web/index.php/admin/saveJobTitle',
  },
  urlPatterns: {
    list: /viewJobTitleList/i,
    add: /saveJobTitle$/i,
  },
  /** Validation messages verified live on the kord instance (2026-06-07). */
  messages: {
    required: 'Required',
    alreadyExists: 'Already exists',
    maxLength: 'Should not exceed 100 characters',
    attachmentSizeExceeded: 'Attachment Size Exceeded',
    /** Rendered to ESS/unauthorised users on direct admin URLs. */
    credentialRequired: 'Credential Required',
  },
  /** Hard-delete confirmation dialog copy (verified live). */
  deleteDialog: {
    title: 'Are you Sure?',
    body: 'The selected record will be permanently deleted. Are you sure you want to continue?',
    confirm: 'Yes, Delete',
    cancel: 'No, Cancel',
  },
  /** Absolute paths to test fixture files (1MB cap: test-photo-large.png is ~1.05MB). */
  files: {
    validSpecification: path.join(FILES_DIR, 'test-document.pdf'),
    validSpecificationName: 'test-document.pdf',
    oversized: path.join(FILES_DIR, 'test-photo-large.png'),
  },
  samples: {
    /** > 50 chars so the list page truncates it behind a "Show More" toggle. */
    longDescription:
      'Owns end-to-end automation pipelines, coaches squads on testability, and curates the regression suite.',
    note: 'Created by the add-job-title automated suite.',
    /** 120 chars — exceeds the 100-char title limit. */
    overlongTitle: 'A'.repeat(120),
  },
  /** Seeded master-data title reused (read-only!) for duplicate checks. */
  masterData: {
    duplicateTitle: 'QA Engineer',
  },
} as const;
