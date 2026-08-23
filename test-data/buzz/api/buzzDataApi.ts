export interface EmployeeSeed {
    employeeId: string;
    firstName: string;
    lastName: string;
    middleName: string;
}

export interface postRecords {
    text: string;
    type: string;
}

export const buzzData = {

    seedRecords: [
        {
            employeeId: '0500',
            firstName: 'Harry',
            lastName: 'Kane',
            middleName: 'Diyago'
        },
        {
            employeeId: '0501',
            firstName: 'John',
            lastName: 'Cena',
            middleName: 'Lasada'
        },
    ] as const satisfies readonly EmployeeSeed[],

    postRecords: [
        {
            text: 'This is the second post.',
            type: 'text'

        },
    ] as const satisfies readonly { text: string; type: string }[],

}


