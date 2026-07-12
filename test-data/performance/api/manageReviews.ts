
export type reviewAPI = {
    activate: boolean,
    dueDate: string,
    empNumber: number,
    endDate: string,
    reviewerEmpNumber: number,
    startDate: string
};

export type reviewEmployee = {
    employeeId: string,
    firstName: string,
    lastName: string,
    middleName: string,
    username: string,
    password: string,
    status: boolean,
    userRoleId: number,
};

/**
 * Seeded in supervisor/ESS pairs: every even index is the supervisor of the
 * odd index that follows it (see the pairing loop in the spec's beforeAll).
 */
const apiEmployees: reviewEmployee[] = [
    {
        employeeId: '0300',
        firstName: 'Rezaa',
        lastName: 'Hendricks',
        middleName: 'Diyago',
        username: 'Rezaa',
        password: 'admin@OHRM123',
        status: true,
        userRoleId: 2,
    },
    {
        employeeId: '0301',
        firstName: 'Maraso',
        lastName: 'Kallis',
        middleName: 'Jack',
        username: 'Jacks',
        password: 'admin@OHRM123',
        status: true,
        userRoleId: 2,
    },
    {
        employeeId: '0302',
        firstName: 'Marco',
        lastName: 'Janson',
        middleName: 'Hales',
        username: 'Marco',
        password: 'admin@OHRM123',
        status: true,
        userRoleId: 2,
    },
    {
        employeeId: '0303',
        firstName: 'Adams',
        lastName: 'Gilchrist',
        middleName: 'Mugas',
        username: 'Adams',
        password: 'admin@OHRM123',
        status: true,
        userRoleId: 2,
    },
    {
        employeeId: '0304',
        firstName: 'Andrew',
        lastName: 'Symonds',
        middleName: 'Phillip',
        username: 'Andrew',
        password: 'admin@OHRM123',
        status: true,
        userRoleId: 2,
    },
    {
        employeeId: '0305',
        firstName: 'Shane',
        lastName: 'Warne',
        middleName: 'Akanaman',
        username: 'Shane',
        password: 'admin@OHRM123',
        status: true,
        userRoleId: 2,
    },
    {
        employeeId: '0306',
        firstName: 'Jonothan',
        lastName: 'Trott',
        middleName: 'Ions',
        username: 'Jonothan',
        password: 'admin@OHRM123',
        status: true,
        userRoleId: 2,
    },
    {
        employeeId: '0307',
        firstName: 'Daniiel',
        lastName: 'Vittori',
        middleName: 'Jasmis',
        username: 'Daniiel',
        password: 'admin@OHRM123',
        status: true,
        userRoleId: 2,
    },
    {
        employeeId: '0308',
        firstName: 'Jonathan',
        lastName: 'Smith',
        middleName: 'James',
        username: 'Jonathan',
        password: 'admin@OHRM123',
        status: true,
        userRoleId: 2,
    },
    {
        employeeId: '0309',
        firstName: 'Michael',
        lastName: 'Johnson',
        middleName: 'David',
        username: 'Michael',
        password: 'admin@OHRM123',
        status: true,
        userRoleId: 2,
    },
    {
        employeeId: '0310',
        firstName: 'William',
        lastName: 'Brown',
        middleName: 'Thomas',
        username: 'william',
        password: 'admin@OHRM123',
        status: true,
        userRoleId: 2,
    },
    {
        employeeId: '0311',
        firstName: 'Daniel',
        lastName: 'Wilson',
        middleName: 'George',
        username: 'daniel',
        password: 'admin@OHRM123',
        status: true,
        userRoleId: 2,
    },
    {
        employeeId: '0312',
        firstName: 'Matthew',
        lastName: 'Taylor',
        middleName: 'Edward',
        username: 'matthew.taylor',
        password: 'admin@OHRM123',
        status: true,
        userRoleId: 2,
    },
    {
        employeeId: '0313',
        firstName: 'Christopher',
        lastName: 'Anderson',
        middleName: 'John',
        username: 'christopher.anderson',
        password: 'admin@OHRM123',
        status: true,
        userRoleId: 2,
    },
    {
        employeeId: '0314',
        firstName: 'Andrew',
        lastName: 'Thomas',
        middleName: 'Paul',
        username: 'andrew.thomas',
        password: 'admin@OHRM123',
        status: true,
        userRoleId: 2,
    },
    {
        employeeId: '0315',
        firstName: 'Benjamin',
        lastName: 'Walker',
        middleName: 'Henry',
        username: 'benjamin.walker',
        password: 'admin@OHRM123',
        status: true,
        userRoleId: 2,
    },
];

export const reviewData = {

    adminPath: '/web/index.php/api/v2/performance/manage/reviews',

    apiEmployees,

    /** Named supervisor/employee pairs so tests never reference apiEmployees by magic index. */
    actors: {
        /** TC-004 — review created and driven through the full lifecycle via the UI. */
        uiLifecycle: { supervisor: apiEmployees[0], employee: apiEmployees[1] },
        /** TC-001 — review created via the UI with Save (stays Inactive). */
        uiSave: { supervisor: apiEmployees[2], employee: apiEmployees[3] },
        /** TC-003 / TC-103 — API-seeded review completed from the list. */
        complete: { supervisor: apiEmployees[4], employee: apiEmployees[5] },
        /** TC-005 — API-seeded review found through the search filters. */
        search: { supervisor: apiEmployees[6], employee: apiEmployees[7] },
        /** Reserved for read-only scenarios. */
        readOnly: { supervisor: apiEmployees[8], employee: apiEmployees[9] },
        /** TC-006 — API-seeded Inactive review edited from the list. */
        edit: { supervisor: apiEmployees[10], employee: apiEmployees[11] },
        /** Spare seeded pair, currently unused by any review. */
        reserve: { supervisor: apiEmployees[12], employee: apiEmployees[13] },
        /** TC-007 — API-seeded review deleted from the list. */
        delete: { supervisor: apiEmployees[14], employee: apiEmployees[15] },
        /** TC-200 — plain ESS account used to probe the admin page. */
        essUser: apiEmployees[1],
    },
}
