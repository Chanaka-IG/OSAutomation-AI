/** UI strings, routes, and form values for Recruitment module tests. */

export const recruitment = {
  routes: {
    candidates: '/web/index.php/recruitment/viewCandidates',
  },
  urlPatterns: {
    candidates: /viewCandidates/i,
  },
  samples: {
    candidateFirstName: 'Test',
    candidateLastName: 'Candidate',
  },
} as const;
