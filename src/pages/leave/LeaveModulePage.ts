import { leave } from '../../../test-data/frontend/leave';
import { BasePage } from '../BasePage';

/**
 * Leave module page objects live under `src/pages/leave/`.
 */
export class LeaveModulePage extends BasePage {
  async openLeaveList(): Promise<void> {
    await this.goto(leave.routes.leaveList);
  }
}
