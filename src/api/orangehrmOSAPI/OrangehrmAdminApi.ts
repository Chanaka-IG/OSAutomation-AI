import { env } from '../../config/env';
import { createLogger } from '../../lib/logger';
import { BaseApiService } from '../BaseApiService';

const log = createLogger('OrangehrmAdminApi');

/**
 * Session/bootstrap calls against OrangeHRM OS (same host as {@link env.baseURL}).
 * Uses {@link APIRequestContext} cookies so follow-up API calls reuse the admin session.
 *
 * Domain-specific APIs live in sibling modules (e.g. `JobTitlesApi.ts`).
 */
export class OrangehrmAdminApi extends BaseApiService {
  /**
   * Fetch login HTML, extract CSRF `_token`, POST `/auth/validate` with admin credentials.
   */
  async loginAsAdmin(): Promise<void> {
    const root = env.baseURL.replace(/\/$/, '');
    if (!root) {
      throw new Error('BASE_URL is required for OrangeHRM API login');
    }

    const loginPageResponse = await this.request.get(`${root}/web/index.php/auth/login`, {
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    // Already authenticated — OrangeHRM redirects away from the login page
    if (!loginPageResponse.url().includes('/auth/login')) {
      log.info(`Admin session already active: ${env.adminUsername}`);
      return;
    }

    const html = await loginPageResponse.text();

    const match = html.match(/:token="&quot;([^"]+)&quot;"/);
    if (!match) {
      throw new Error('CSRF token not found in login page HTML');
    }

    const csrfToken = match[1];

    const response = await this.request.post(`${root}/web/index.php/auth/validate`, {
      form: {
        username: env.adminUsername,
        password: env.adminPassword,
        _token: csrfToken,
      },
    });

    const status = response.status();
    const body = await response.text();

    if (!response.ok()) {
      log.error('OrangeHRM admin login failed', { status, body: body.slice(0, 400) });
      throw new Error(`OrangeHRM login failed: HTTP ${status}\n${body.slice(0, 800)}`);
    }

    if (body.includes('Invalid credentials')) {
      log.error('OrangeHRM admin login rejected: invalid credentials');
      throw new Error('Invalid username or password');
    }

    log.info(`Admin session established: ${env.adminUsername}`);
  }


  async loginAsESS(useraName: string, passwrod: string): Promise<void> {
    const root = env.baseURL.replace(/\/$/, '');
    if (!root) {
      throw new Error('BASE_URL is required for OrangeHRM API login');
    }

    const loginPageResponse = await this.request.get(`${root}/web/index.php/auth/login`, {
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    // Already authenticated — OrangeHRM redirects away from the login page
    if (!loginPageResponse.url().includes('/auth/login')) {
      log.info(`Admin session already active: ${env.adminUsername}`);
      return;
    }

    const html = await loginPageResponse.text();

    const match = html.match(/:token="&quot;([^"]+)&quot;"/);
    if (!match) {
      throw new Error('CSRF token not found in login page HTML');
    }

    const csrfToken = match[1];

    const response = await this.request.post(`${root}/web/index.php/auth/validate`, {
      form: {
        username: useraName,
        password: passwrod,
        _token: csrfToken,
      },
    });

    const status = response.status();
    const body = await response.text();

    if (!response.ok()) {
      log.error('OrangeHRM ESS login failed', { status, body: body.slice(0, 400) });
      throw new Error(`OrangeHRM ESS login failed: HTTP ${status}\n${body.slice(0, 800)}`);
    }

    if (body.includes('Invalid credentials')) {
      log.error('OrangeHRM ESS login rejected: invalid credentials');
      throw new Error('Invalid username or password for ESS');
    }

    log.info(`ESS session established: ${useraName}`);
  }

  async logout() {
    const root = env.baseURL.replace(/\/$/, '');
    const response = await this.get(`${root}/web/index.php/auth/logout`)


    if (!response.ok()) {
      log.error('OrangeHRM logout Failed');
      throw new Error(`OrangeHRM logout Failed`);
    }
    log.info(`Successfully logout`)
  }
}
