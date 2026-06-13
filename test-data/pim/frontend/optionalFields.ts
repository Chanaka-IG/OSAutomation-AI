/** UI strings, routes, and field metadata for PIM → Configuration → Optional Fields tests. */

import type { OptionalFieldsConfig } from '../api/optionalFields';

/** Logical field keys mapped to their on-screen row caption + payload key + downstream label. */
export type OptionalFieldKey = 'deprecated' | 'ssn' | 'sin' | 'tax';

export const optionalFields = {
  routes: {
    config: '/web/index.php/pim/configurePim',
  },
  urlPatterns: {
    config: /pim\/configurePim$/i,
  },
  messages: {
    successToast: 'Successfully Saved',
    /** Rendered to ESS/unauthorised users on the direct admin URL. */
    credentialRequired: 'Credential Required',
  },
  /** A seeded employee (Marcus Chen, empNumber 2) used read-only for downstream-visibility checks. */
  sampleEmpNumber: 2,
  /**
   * Per-toggle metadata, verified live (OS 5.8, 2026-06-13):
   * - rowCaption: unique substring of the toggle's row, used to scope the switch.
   * - payloadKey: the GET/PUT boolean key.
   * - personalDetailsLabels: field labels that appear in Personal Details when ON (empty for menu-only).
   * - recordMenuTab: the employee-record menu tab that appears when ON (only `tax`).
   */
  fields: {
    deprecated: {
      rowCaption: 'Nick Name',
      payloadKey: 'pimShowDeprecatedFields',
      personalDetailsLabels: ['Nickname', 'Smoker', 'Military Service'],
      recordMenuTab: null,
    },
    ssn: {
      rowCaption: 'Show SSN field',
      payloadKey: 'showSSN',
      personalDetailsLabels: ['SSN Number'],
      recordMenuTab: null,
    },
    sin: {
      rowCaption: 'Show SIN field',
      payloadKey: 'showSIN',
      personalDetailsLabels: ['SIN Number'],
      recordMenuTab: null,
    },
    tax: {
      rowCaption: 'US Tax Exemptions',
      payloadKey: 'showTaxExemptions',
      personalDetailsLabels: [],
      recordMenuTab: 'Tax Exemptions',
    },
  } satisfies Record<
    OptionalFieldKey,
    {
      rowCaption: string;
      payloadKey: keyof OptionalFieldsConfig;
      personalDetailsLabels: string[];
      recordMenuTab: string | null;
    }
  >,
} as const;
