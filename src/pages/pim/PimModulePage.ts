import { pim } from '../../../test-data/frontend/pim';
import { BasePage } from '../BasePage';

/**
 * PIM module page objects live under `src/pages/pim/`.
 * Add feature pages (e.g. `AddEmployeePage.ts`) and import them from tests or compose here as needed.
 */
export class PimModulePage extends BasePage {
  async openEmployeeList(): Promise<void> {
    await this.goto(pim.routes.employeeList);
  }
}
