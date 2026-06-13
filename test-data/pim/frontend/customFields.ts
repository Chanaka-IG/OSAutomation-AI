/** UI strings, routes, and form values for PIM → Configuration → Custom Fields tests. */

export const customFields = {
  routes: {
    list: '/web/index.php/pim/listCustomFields',
    add: '/web/index.php/pim/saveCustomFields',
  },
  urlPatterns: {
    list: /pim\/listCustomFields$/i,
    add: /pim\/saveCustomFields$/i,
  },
  messages: {
    required: 'Required',
    alreadyExists: 'Already exists',
    successToast: 'Successfully Saved',
    /** Rendered to ESS/unauthorised users on the direct admin URLs. */
    credentialRequired: 'Credential Required',
  },
  deleteDialog: {
    title: 'Are you Sure?',
    body: 'The selected record will be permanently deleted. Are you sure you want to continue?',
    confirm: 'Yes, Delete',
    cancel: 'No, Cancel',
  },
  /** Visible option labels in the Screen / Type dropdowns (verified live). */
  screens: {
    personalDetails: 'Personal Details',
    contactDetails: 'Contact Details',
  },
  types: {
    textOrNumber: 'Text or Number',
    dropDown: 'Drop Down',
  },
  /** Lowercased screen keys returned/accepted by the API. */
  screenKeys: {
    personal: 'personal',
  },
  /** A seeded employee (Marcus Chen, empNumber 2) used read-only for on-screen rendering checks. */
  sampleEmpNumber: 2,
  samples: {
    dropDownOptions: 'Red, Green, Blue',
    whitespaceName: '   ',
    xssName: "<script>alert('xss')</script>",
  },
} as const;
