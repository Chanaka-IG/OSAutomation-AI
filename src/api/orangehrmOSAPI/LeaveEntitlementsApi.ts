import { createLogger } from '../../lib/logger';
import { BaseApiService } from '../BaseApiService';

const log = createLogger('LeaveEntitlementsApi');

export type LeaveEntitlementSeed = {
  empNumber: number;
  leaveTypeId: number;
  entitlement: number;
  fromDate: string;
  toDate: string;
};

export class LeaveEntitlementsApi extends BaseApiService {
  private readonly path = '/web/index.php/api/v2/leave/leave-entitlements';

  async createOrUpdateEntitlement(payload: LeaveEntitlementSeed): Promise<void> {
    const res = await this.post(this.path, {
      data: payload,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    });
    if (!res.ok()) {
      // Fail fast: a silently-missing entitlement surfaces much later as an obscure
      // UI failure (e.g. the leave type absent from the Apply dropdown).
      const text = await res.text();
      throw new Error(
        `LeaveEntitlementsApi.createOrUpdateEntitlement failed: HTTP ${res.status()} ` +
          `empNumber=${payload.empNumber} leaveTypeId=${payload.leaveTypeId}\n${text.slice(0, 400)}`,
      );
    }
    log.info(
      `Entitlement set: empNumber=${payload.empNumber} leaveTypeId=${payload.leaveTypeId} days=${payload.entitlement}`,
    );
  }

  async getEntitlementBalance(empNumber: number, leaveTypeId: number): Promise<number> {
    const res = await this.get(
      `${this.path}?empNumber=${empNumber}&leaveTypeId=${leaveTypeId}`,
      { headers: { Accept: 'application/json' } },
    );
    if (!res.ok()) return 0;
    const json = (await res.json()) as { data?: Array<{ entitlement: number; daysUsed: number }> };
    return (json.data ?? []).reduce((sum, item) => sum + (item.entitlement - item.daysUsed), 0);
  }
}
