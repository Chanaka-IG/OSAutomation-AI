import path from 'path';
import type { EmployeeSeed } from '../api/employees';

const FILES_DIR = path.join(__dirname, '../../files');

export const addEmployee = {
  apiPath: '/web/index.php/api/v2/pim/employees',

  /** Known employee seeded for duplicate-ID validation (TC-PIM-AE-N05). */
  duplicateIdSeed: {
    employeeId: '061001',
    firstName: 'Olivia',
    lastName: 'Nguyen',
    middleName: 'Anne',
  } as EmployeeSeed,

  /** Always-present username for duplicate-username test (TC-PIM-AE-N10). */
  existingUsername: 'admin',

  /** Strong password accepted by OrangeHRM password policy. */
  testPassword: 'Admin@12345',

  /** OrangeHRM DB limit for firstName / lastName / middleName fields (OrangeHRM OS 5.8: 30 chars). */
  maxNameLength: 30,

  /** Absolute paths to test fixture files. */
  files: {
    validJpg: path.join(FILES_DIR, 'test-photo.jpg'),
    validPng: path.join(FILES_DIR, 'test-photo.png'),
    invalidDocument: path.join(FILES_DIR, 'test-document.pdf'),
    oversizedImage: path.join(FILES_DIR, 'test-photo-large.png'),
  },
} as const;
