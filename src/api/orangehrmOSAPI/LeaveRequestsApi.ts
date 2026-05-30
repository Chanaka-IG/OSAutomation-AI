import { createLogger } from '../../lib/logger';
import { BaseApiService } from '../BaseApiService';

const log = createLogger('LeaveRequestsApi');

export type ApplyLeaveSeed = {
  leaveTypeId: number;
  fromDate: string;
  toDate: string;
  comment?: string;
  /** OXD duration type; defaults to `full_day`. */
  durationType?: string;
};

export type LeaveRequestAction = 'APPROVE' | 'REJECT' | 'CANCEL';

export type LeaveRequestSummary = {
  id: number;
  status: string;
  allowedActions: string[];
};

/**
 * Leave requests REST API (v2).
 *
 * Two endpoints, used with different sessions:
 *  - `apply` → `POST /leave/leave-requests` in the EMPLOYEE's own session creates a
 *    **Pending Approval** request (mirrors the Apply Leave page). Used to seed the
 *    requests that Admin/Supervisor then act on.
 *  - `action` / `getByStatus` → `/leave/employees/leave-requests` is the Admin/Supervisor
 *    endpoint (note the `employees/` segment) the Leave List drives.
 */
export class LeaveRequestsApi extends BaseApiService {
  private readonly applyPath = '/web/index.php/api/v2/leave/leave-requests';
  private readonly adminPath = '/web/index.php/api/v2/leave/employees/leave-requests';

  /** Self-apply leave in the CURRENT session (→ Pending Approval). Returns the new request id. */
  async apply(payload: ApplyLeaveSeed): Promise<number> {
    const res = await this.post(this.applyPath, {
      data: {
        leaveTypeId: payload.leaveTypeId,
        fromDate: payload.fromDate,
        toDate: payload.toDate,
        comment: payload.comment ?? null,
        duration: { type: payload.durationType ?? 'full_day' },
      },
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    });
    if (!res.ok()) {
      const text = await res.text();
      throw new Error(
        `LeaveRequestsApi.apply failed: HTTP ${res.status()} (${payload.fromDate})\n${text.slice(0, 400)}`,
      );
    }
    const json = (await res.json()) as { data?: { id?: number } };
    const id = json.data?.id;
    if (!id) {
      throw new Error(`LeaveRequestsApi.apply: no request id returned for ${payload.fromDate}`);
    }
    log.info(`Applied leave id=${id} on ${payload.fromDate}`);
    return id;
  }

  /** Approve / Reject / Cancel a request (Admin or Supervisor session). */
  async action(leaveRequestId: number, action: LeaveRequestAction): Promise<void> {
    const res = await this.put(`${this.adminPath}/${leaveRequestId}`, {
      data: { action },
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    });
    if (!res.ok()) {
      const text = await res.text();
      throw new Error(
        `LeaveRequestsApi.action(${action}) failed: HTTP ${res.status()} id=${leaveRequestId}\n${text.slice(0, 400)}`,
      );
    }
    log.info(`Action ${action} applied to leave id=${leaveRequestId}`);
  }

  /**
   * Requests for an employee in a given status (Admin/Supervisor session).
   * Returns each request's id, joined status label, and allowed actions.
   */
  async getByStatus(
    empNumber: number,
    fromDate: string,
    toDate: string,
    statusCode: number,
  ): Promise<LeaveRequestSummary[]> {
    const url =
      `${this.adminPath}?empNumber=${empNumber}&fromDate=${fromDate}&toDate=${toDate}` +
      `&limit=50&includeEmployees=onlyCurrent&statuses[]=${statusCode}`;
    const res = await this.get(url, { headers: { Accept: 'application/json' } });
    if (!res.ok()) return [];
    const json = (await res.json()) as {
      data?: Array<{
        id: number;
        leaveBreakdown: Array<{ name: string }>;
        allowedActions?: Array<{ action: string }>;
      }>;
    };
    return (json.data ?? []).map((x) => ({
      id: x.id,
      status: x.leaveBreakdown.map((b) => b.name).join(','),
      allowedActions: (x.allowedActions ?? []).map((a) => a.action),
    }));
  }
}
