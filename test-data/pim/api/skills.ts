import {env} from '../../../src/config/env';

export type skillSeed = {
    description: string,
    name: string
}

export const skills = {
    get orangehrmBaseURL(): string {
    return env.baseURL.replace(/\/$/, '');
  },

  adminPath : '/web/index.php/api/v2/admin/skills',

  get adminUrl(): string {
    return `${this.orangehrmBaseURL}${this.adminPath}`;
  },

 seedRecords : [
    {
        description: 'Ability to write code in JavaScript, TypeScript, and Python.',
        name: 'Programming'
    },
    {
        description: 'Experience with cloud platforms like AWS, Azure, or GCP.',
        name: 'Cloud Computing'
    },
    {
        description: 'Proficiency in using Git for version control and collaboration.',
        name: 'Version Control'
    }
 ] as const satisfies readonly skillSeed[],

};