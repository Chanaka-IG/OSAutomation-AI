import type {
  ClaimRequestSeed,
  ClaimExpenseSeed,
  ClaimRequestRecord,
} from '../../../test-data/claim/api/claimRequests';
import { claimRequests as claimRequestsData } from '../../../test-data/claim/api/claimRequests';
import { createLogger } from '../../lib/logger';
import { BaseApiService } from '../BaseApiService';

const log = createLogger('ClaimRequestsApi');

/**
 * OrangeHRM Claim API v2 — claim requests (self-scoped to the authenticated employee).
 * Use an ESS-authenticated request context to act as that employee.
 * NOTE: claim requests cannot be deleted (DELETE → 405) — they are permanent.
 */
export class ClaimRequestsApi extends BaseApiService {
  /** Creates a claim request (status INITIATED) and returns its id/referenceId/status. */
  async create(payload: ClaimRequestSeed): Promise<ClaimRequestRecord> {
    const response = await this.post(claimRequestsData.adminPath, {
      data: {
        claimEventId: payload.claimEventId,
        currencyId: payload.currencyId,
        remarks: payload.remarks ?? null,
      },
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    });
    if (!response.ok()) {
      const text = await response.text();
      throw new Error(`ClaimRequestsApi.create failed: HTTP ${response.status()}\n${text.slice(0, 400)}`);
    }
    const json = (await response.json()) as { data: ClaimRequestRecord };
    log.info(`Claim request created: ${json.data.referenceId} (id ${json.data.id})`);
    return json.data;
  }

  /** Admin: assign/create a claim request on behalf of an employee (status INITIATED). */
  async createForEmployee(empNumber: number, payload: ClaimRequestSeed): Promise<ClaimRequestRecord> {
    const response = await this.post(`${claimRequestsData.employeesPath}/${empNumber}/requests`, {
      data: {
        claimEventId: payload.claimEventId,
        currencyId: payload.currencyId,
        remarks: payload.remarks ?? null,
      },
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    });
    if (!response.ok()) {
      const text = await response.text();
      throw new Error(`ClaimRequestsApi.createForEmployee failed: HTTP ${response.status()}\n${text.slice(0, 400)}`);
    }
    const json = (await response.json()) as { data: ClaimRequestRecord };
    log.info(`Claim assigned to empNumber=${empNumber}: ${json.data.referenceId} (id ${json.data.id})`);
    return json.data;
  }

  async addExpense(requestId: number, payload: ClaimExpenseSeed): Promise<void> {
    const response = await this.post(`${claimRequestsData.adminPath}/${requestId}/expenses`, {
      data: {
        expenseTypeId: payload.expenseTypeId,
        date: payload.date,
        amount: payload.amount,
        note: payload.note ?? null,
      },
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    });
    if (!response.ok()) {
      const text = await response.text();
      throw new Error(`ClaimRequestsApi.addExpense failed: HTTP ${response.status()}\n${text.slice(0, 400)}`);
    }
  }

  /** Applies a lifecycle action — "SUBMIT" or "CANCEL". */
  async action(requestId: number, action: 'SUBMIT' | 'CANCEL'): Promise<void> {
    const response = await this.put(`${claimRequestsData.adminPath}/${requestId}/action`, {
      data: { action },
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    });
    if (!response.ok()) {
      const text = await response.text();
      throw new Error(`ClaimRequestsApi.action(${action}) failed: HTTP ${response.status()}\n${text.slice(0, 400)}`);
    }
  }

  async getRequest(requestId: number): Promise<ClaimRequestRecord> {
    const response = await this.get(`${claimRequestsData.adminPath}/${requestId}`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok()) {
      throw new Error(`ClaimRequestsApi.getRequest failed: HTTP ${response.status()}`);
    }
    return ((await response.json()) as { data: ClaimRequestRecord }).data;
  }
}
