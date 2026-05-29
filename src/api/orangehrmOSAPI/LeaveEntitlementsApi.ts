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
      const text = await res.text();
      log.warn(
        `createOrUpdateEntitlement HTTP ${res.status()} for empNumber=${payload.empNumber}: ${text.slice(0, 200)}`,
      );
    } else {
      log.info(
        `Entitlement set: empNumber=${payload.empNumber} leaveTypeId=${payload.leaveTypeId} days=${payload.entitlement}`,
      );
    }
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
