import { recruitment } from '../../../test-data/recruitment/frontend/recruitment';
import { BasePage } from '../BasePage';

/**
 * Recruitment module page objects live under `src/pages/recruitment/`.
 */
export class RecruitmentModulePage extends BasePage {
  async openCandidates(): Promise<void> {
    await this.goto(recruitment.routes.candidates);
  }
}
