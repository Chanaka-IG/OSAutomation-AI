/**
 * Test data for PIM → Employee Details → Personal Details tab.
 * Suite: tests/pim/employee-details-personal-details.spec.ts
 *
 * The seed employee is created fresh in beforeAll and deleted in afterAll.
 * No master-data seeded employees (061001/061002/061003/000x series) are used.
 */

export const employeeDetails = {
  /**
   * Dedicated test employee — created by the spec's beforeAll, deleted in afterAll.
   * Employee ID chosen outside all known seeded ranges.
   */
  seed: {
    employeeId: 'EDPD01',
    firstName: 'PersonalDet',
    lastName: 'TestEmployee',
    middleName: 'Suite',
  },

  /**
   * An Employee ID known to already exist (Ruwan Kumara, empNumber 0001).
   * Used by TC-PIM-ED-N04 (duplicate ID validation).
   */
  existingEmployeeId: '0001',

  personalDetails: {
    /** Valid field values for positive update tests. */
    update: {
      firstName: 'UpdatedFirst',
      middleName: 'UpdatedMiddle',
      lastName: 'UpdatedLast',
      otherId: 'OTH-2026',
      driversLicense: 'DL-9876543',
      licenseExpiryDate: '2028-12-31',
      dateOfBirth: '1990-06-15',
      gender: 'Female' as const,
    },

    /** OrangeHRM OS 5.8 DB column limit for firstName / lastName / middleName. */
    maxNameLength: 30,

    /** Benign script probe used by TC-PIM-ED-E02. */
    xssProbe: '<script>alert(1)</script>',

    /** Unicode names used by TC-PIM-ED-E01. */
    unicodeFirstName: 'Héléna',
    unicodeLastName: 'Müller',

    /** Date in the far future — must be rejected by Date of Birth validation (TC-PIM-ED-E03). */
    futureDateOfBirth: '2099-01-01',
  },
} as const;
