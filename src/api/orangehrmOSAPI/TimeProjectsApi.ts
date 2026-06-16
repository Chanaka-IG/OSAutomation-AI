import { projects as projectsData } from '../../../test-data/time/frontend/projects';
import { createLogger } from '../../lib/logger';
import { BaseApiService } from '../BaseApiService';

const log = createLogger('TimeProjectsApi');

const JSON_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
} as const;

export type CustomerRecord = { id: number; name: string; description: string; deleted: boolean };
export type ProjectRecord = {
  id: number;
  name: string;
  description: string | null;
  customer: { id: number; name: string; deleted: boolean };
  deleted: boolean;
  projectAdmins: unknown[];
};

/**
 * OrangeHRM Time API v2 — Project Info → Projects & Customers. Used for deterministic seeding/cleanup
 * around the Projects E2E suite (a project requires a customer). Host is `env.baseURL`.
 */
export class TimeProjectsApi extends BaseApiService {
  private base(path: string): string {
    return `${projectsData.apiBaseUrl}${path}`;
  }

  // ── Customers ───────────────────────────────────────────────────────────
  async getCustomers(): Promise<CustomerRecord[]> {
    const res = await this.get(`${this.base(projectsData.apiPaths.customers)}?limit=50&offset=0`, {
      headers: JSON_HEADERS,
    });
    if (!res.ok()) throw new Error(`TimeProjectsApi.getCustomers failed: HTTP ${res.status()}`);
    return ((await res.json()) as { data: CustomerRecord[] }).data ?? [];
  }

  async createCustomer(name: string, description = ''): Promise<CustomerRecord> {
    const res = await this.post(this.base(projectsData.apiPaths.customers), {
      headers: JSON_HEADERS,
      data: { name, description },
    });
    if (!res.ok()) {
      throw new Error(`TimeProjectsApi.createCustomer failed: HTTP ${res.status()}\n${(await res.text()).slice(0, 300)}`);
    }
    log.info('Customer created', { name });
    return ((await res.json()) as { data: CustomerRecord }).data;
  }

  /** Returns an existing customer id by name, or creates one. */
  async ensureCustomer(name: string): Promise<number> {
    const existing = (await this.getCustomers()).find((c) => c.name === name);
    if (existing) return existing.id;
    return (await this.createCustomer(name)).id;
  }

  async deleteCustomers(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    const res = await this.delete(this.base(projectsData.apiPaths.customers), {
      headers: JSON_HEADERS,
      data: { ids },
    });
    if (!res.ok()) {
      log.warn('deleteCustomers non-OK', { status: res.status(), ids });
    }
  }

  // ── Projects ────────────────────────────────────────────────────────────
  async getProjects(): Promise<ProjectRecord[]> {
    const res = await this.get(
      `${this.base(projectsData.apiPaths.projects)}?limit=50&offset=0&sortField=project.name&sortOrder=ASC&model=detailed`,
      { headers: JSON_HEADERS },
    );
    if (!res.ok()) throw new Error(`TimeProjectsApi.getProjects failed: HTTP ${res.status()}`);
    return ((await res.json()) as { data: ProjectRecord[] }).data ?? [];
  }

  async createProject(payload: {
    name: string;
    customerId: number;
    description?: string | null;
    projectAdminsEmpNumbers?: number[];
  }): Promise<ProjectRecord> {
    const res = await this.post(this.base(projectsData.apiPaths.projects), {
      headers: JSON_HEADERS,
      data: {
        name: payload.name,
        description: payload.description ?? null,
        customerId: payload.customerId,
        projectAdminsEmpNumbers: payload.projectAdminsEmpNumbers ?? [],
      },
    });
    if (!res.ok()) {
      throw new Error(`TimeProjectsApi.createProject failed: HTTP ${res.status()}\n${(await res.text()).slice(0, 300)}`);
    }
    log.info('Project created', { name: payload.name });
    return ((await res.json()) as { data: ProjectRecord }).data;
  }

  async getProjectIdByName(name: string): Promise<number | undefined> {
    return (await this.getProjects()).find((p) => p.name === name)?.id;
  }

  async deleteProjects(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    const res = await this.delete(this.base(projectsData.apiPaths.projects), {
      headers: JSON_HEADERS,
      data: { ids },
    });
    if (!res.ok()) {
      log.warn('deleteProjects non-OK', { status: res.status(), ids });
    }
  }

  /** Resolves names to ids and hard-deletes them (safe with names that no longer exist). */
  async deleteProjectsByNames(names: string[]): Promise<void> {
    if (names.length === 0) return;
    const all = await this.getProjects();
    const ids = all.filter((p) => names.includes(p.name)).map((p) => p.id);
    await this.deleteProjects(ids);
  }

  // ── Activities ───────────────────────────────────────────────────────────
  /** Activities path is singular: `/api/v2/time/project/{id}/activities`. */
  private activitiesPath(projectId: number): string {
    return `${projectsData.apiBaseUrl}/web/index.php/api/v2/time/project/${projectId}/activities`;
  }

  async getActivities(projectId: number): Promise<{ id: number; name: string }[]> {
    const res = await this.get(`${this.activitiesPath(projectId)}?limit=50&offset=0`, {
      headers: JSON_HEADERS,
    });
    if (!res.ok()) throw new Error(`TimeProjectsApi.getActivities failed: HTTP ${res.status()}`);
    return ((await res.json()) as { data: { id: number; name: string }[] }).data ?? [];
  }

  async createActivity(projectId: number, name: string): Promise<{ id: number; name: string }> {
    const res = await this.post(this.activitiesPath(projectId), {
      headers: JSON_HEADERS,
      data: { name },
    });
    if (!res.ok()) {
      throw new Error(`TimeProjectsApi.createActivity failed: HTTP ${res.status()}\n${(await res.text()).slice(0, 300)}`);
    }
    log.info('Activity created', { projectId, name });
    return ((await res.json()) as { data: { id: number; name: string } }).data;
  }

  /** Returns an existing activity id by name on the project, or creates one. */
  async ensureActivity(projectId: number, name: string): Promise<number> {
    const existing = (await this.getActivities(projectId)).find((a) => a.name === name);
    if (existing) return existing.id;
    return (await this.createActivity(projectId, name)).id;
  }
}
