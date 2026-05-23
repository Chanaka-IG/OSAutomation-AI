/** UI strings, routes, and form values for Recruitment module tests. */

export const recruitment = {
  routes: {
    candidates: '/web/index.php/recruitment/viewCandidates',
    addCandidate: '/web/index.php/recruitment/addCandidate',
    vacancies: '/web/index.php/recruitment/viewJobVacancy',
    addVacancy: '/web/index.php/recruitment/addJobVacancy',
  },
  urlPatterns: {
    candidates: /viewCandidates/i,
    vacancies: /viewJobVacancy/i,
    addVacancy: /addJobVacancy/i,
  },
  api: {
    vacanciesPath: '/web/index.php/api/v2/recruitment/vacancies',
  },
  samples: {
    candidateFirstName: 'Priya',
    candidateLastName: 'Sharma',
  },
} as const;
