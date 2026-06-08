import type { EmployeeSeed } from '../../../test-data/pim/api/employees';
import { employees as employeesData } from '../../../test-data/pim/api/employees';
import { createLogger } from '../../lib/logger';
import { BaseApiService } from '../BaseApiService';

const log = createLogger('EmployeesApi');

/**
 * OrangeHRM Admin API v2 - employees.
 * Uses relative {@link employeesData.adminPath}; host is `orangehrmApiContext` `baseURL`
 * (= {@link employeesData.orangehrmBaseURL} / `BASE_URL`). Full URL: {@link employeesData.adminUrl}.
 */
export class EmployeesApi extends BaseApiService {
  async create(payload: EmployeeSeed): Promise<void> {
    const response = await this.postEmployee(payload);
    if (!response.ok()) {
      const text = await response.text();
      const displayName = this.displayName(payload);
      log.error(`Failed to add employee: ${displayName} (${payload.employeeId})`, {
        status: response.status(),
        body: text.slice(0, 400),
      });
      throw new Error(
        `EmployeesApi.create failed: HTTP ${response.status()} ${payload.employeeId}\n${text.slice(0, 600)}`,
      );
    }

    log.info(`Employee successfully added: ${this.displayName(payload)}`);
  }

  /**
   * POST create; no-op if the server reports an existing id/name conflict (idempotent UI seeds).
   */
  async createIfAbsent(payload: EmployeeSeed): Promise<void> {
    const response = await this.postEmployee(payload);
    if (response.ok()) {
      log.info(`Employee successfully added: ${this.displayName(payload)}`);
      return;
    }
    const text = await response.text();
    const status = response.status();
    if (
      status === 422 ||
      status === 409 ||
      status === 400 ||
      /already|duplicate|exist|unique/i.test(text)
    ) {
      // NOTE: 400/422 can also be a genuine validation failure — keep the body in the
      // log so a wrongly-skipped create stays diagnosable.
      log.info(`Employee already present, skipping: ${payload.employeeId})`);
      return;
    }

    log.error(`Failed to add employee: ${this.displayName(payload)} (${payload.employeeId})`, {
      status,
      body: text.slice(0, 400),
    });
    throw new Error(
      `EmployeesApi.createIfAbsent failed: HTTP ${status} ${payload.employeeId}\n${text.slice(0, 600)}`,
    );
  }

  async getEmpNumberByEmployeeId(employeeId: string): Promise<number | undefined> {
    const response = await this.get(
      `${employeesData.adminPath}?employeeId=${encodeURIComponent(employeeId)}&limit=1`,
      { headers: { Accept: 'application/json' } },
    );
    if (!response.ok()) return undefined;
    const json = (await response.json()) as { data: Array<{ empNumber: number }> };
    return json.data?.[0]?.empNumber;
  }

  async getEmpNumberByFullName(firstName: string, lastName: string): Promise<number | undefined> {
    const search = encodeURIComponent(`${firstName} ${lastName}`);
    const response = await this.get(
      `${employeesData.adminPath}?nameOrId=${search}&limit=50`,
      { headers: { Accept: 'application/json' } },
    );
    if (!response.ok()) return undefined;
    const json = (await response.json()) as {
      data: Array<{ empNumber: number; firstName: string; lastName: string }>;
    };
    return json.data?.find((e) => e.firstName === firstName && e.lastName === lastName)?.empNumber;
  }

  /**
   * PUT overwrites the whole job-details record: any field not passed is set to NULL
   * (including joinedDate). Safe for freshly-seeded test employees; do not use to
   * partially update an employee whose existing job details must survive.
   */
  async updateJobDetails(
    empNumber: number,
    details: {
      jobTitleId?: number;
      empStatusId?: number;
      subunitId?: number;
      locationId?: number;
    },
  ): Promise<void> {
    const response = await this.put(`${employeesData.adminPath}/${empNumber}/job-details`, {
      data: {
        joinedDate: null,
        jobTitleId: details.jobTitleId ?? null,
        empStatusId: details.empStatusId ?? null,
        subunitId: details.subunitId ?? null,
        locationId: details.locationId ?? null,
      },
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    });
    if (!response.ok()) {
      const text = await response.text();
      throw new Error(
        `EmployeesApi.updateJobDetails failed: HTTP ${response.status()} empNumber=${empNumber}\n${text.slice(0, 600)}`,
      );
    }
    log.info(`Job details updated for empNumber=${empNumber}`);
  }

  /**
   * Sets the employee's work contact info (read back by the Directory detail panel).
   * NOTE: the contact-details route uses the SINGULAR `pim/employee/{n}` path —
   * `pim/employees/{n}/contact-details` 404s (verified live 2026-06-07).
   */
  async updateContactDetails(
    empNumber: number,
    details: { workEmail?: string; workTelephone?: string },
  ): Promise<void> {
    const singularPath = employeesData.adminPath.replace(/\/employees$/, '/employee');
    const response = await this.put(`${singularPath}/${empNumber}/contact-details`, {
      data: {
        workEmail: details.workEmail ?? null,
        workTelephone: details.workTelephone ?? null,
      },
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    });
    if (!response.ok()) {
      const text = await response.text();
      throw new Error(
        `EmployeesApi.updateContactDetails failed: HTTP ${response.status()} empNumber=${empNumber}\n${text.slice(0, 600)}`,
      );
    }
    log.info(`Contact details updated for empNumber=${empNumber}`);
  }

  async getSupervisorEmpNumbers(empNumber: number): Promise<number[]> {
    const response = await this.get(
      `${employeesData.adminPath}/${empNumber}/supervisors?limit=50&offset=0`,
      { headers: { Accept: 'application/json' } },
    );
    if (!response.ok()) return [];
    const json = (await response.json()) as { data: Array<{ supervisor: { empNumber: number } }> };
    return (json.data ?? []).map((r) => r.supervisor.empNumber);
  }

  /** POST supervisor; no-op if the supervisor relationship already exists. */
  async addSupervisorIfAbsent(
    empNumber: number,
    supervisorEmpNumber: number,
    reportingMethodId: number,
  ): Promise<void> {
    const existing = await this.getSupervisorEmpNumbers(empNumber);
    if (existing.includes(supervisorEmpNumber)) {
      log.info(`Supervisor empNumber=${supervisorEmpNumber} already set for empNumber=${empNumber}, skipping`);
      return;
    }
    const response = await this.post(`${employeesData.adminPath}/${empNumber}/supervisors`, {
      data: { empNumber: supervisorEmpNumber, reportingMethodId },
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    });
    if (!response.ok()) {
      const text = await response.text();
      throw new Error(
        `EmployeesApi.addSupervisorIfAbsent failed: HTTP ${response.status()} empNumber=${empNumber}\n${text.slice(0, 600)}`,
      );
    }
    log.info(`Supervisor empNumber=${supervisorEmpNumber} added for empNumber=${empNumber}`);
  }

  /** Bulk-delete employees by empNumber. Silently ignores partial failures. */
  async deleteEmployees(empNumbers: number[]): Promise<void> {
    if (empNumbers.length === 0) return;
    const response = await this.delete(employeesData.adminPath, {
      data: { ids: empNumbers },
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok()) {
      const text = await response.text();
      log.warn(`deleteEmployees partial failure: HTTP ${response.status()} ${text.slice(0, 200)}`);
    } else {
      log.info(`Employees deleted: [${empNumbers.join(', ')}]`);
    }
  }

  private displayName(payload: EmployeeSeed): string {
    return [payload.firstName, payload.middleName, payload.lastName].filter(Boolean).join(' ');
  }

  private postEmployee(payload: EmployeeSeed): ReturnType<BaseApiService['post']> {
    return this.post(employeesData.adminPath, {
      data: {
        employeeId: payload.employeeId,
        firstName: payload.firstName,
        lastName: payload.lastName,
        middleName: payload.middleName,
      },
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
  }
}
