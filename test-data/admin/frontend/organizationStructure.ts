/** UI strings, routes, and form values for Admin → Organization → Structure tests.
 *  Selectors/messages verified live via Playwright MCP on the kord instance (2026-06-11). */

export const adminOrganizationStructure = {
  routes: {
    /** Tree page (and the post-mutation re-render target). */
    list: '/web/index.php/admin/viewCompanyStructure',
  },
  urlPatterns: {
    list: /viewCompanyStructure$/i,
  },
  /** Validation / dialog messages verified live. */
  messages: {
    required: 'Required',
    /** GLOBAL uniqueness — NOT "Already exists" (verified live). */
    duplicateName: 'Organization unit name should be unique',
    /** Name and Unit Id both cap at 100 chars. */
    maxLength: 'Should not exceed 100 characters',
    /** Rendered to ESS/unauthorised users on the direct admin URL. */
    credentialRequired: 'Credential Required',
  },
  /** Add / Edit dialog copy. */
  dialog: {
    addTitle: 'Add Organization Unit',
    editTitle: 'Edit Organization Unit',
    /** Note shown only on the Add dialog; `<parentName>` substituted live. */
    addUnderNote: (parentName: string) => `This unit will be added under ${parentName}`,
  },
  /** Delete confirmation dialog copy (standard OXD "Are you Sure?"). */
  deleteDialog: {
    title: 'Are you Sure?',
    confirm: 'Yes, Delete',
    cancel: 'No, Cancel',
  },
  /** The company root node label (from General Information on the kord instance). */
  rootName: 'Automation',
  samples: {
    /** 101 chars — exceeds the 100-char Name/Unit Id limit (live length error). */
    overlongName: 'A'.repeat(101),
    description: 'Created by the organization-structure E2E suite.',
  },
} as const;
