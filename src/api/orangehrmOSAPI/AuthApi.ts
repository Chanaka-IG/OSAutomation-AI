import { createLogger } from '../../lib/logger';
import { BaseApiService } from '../BaseApiService';

const log = createLogger('AuthApi');

/**
 * Generic OrangeHRM web-session login for ANY user (not just admin).
 *
 * Mirrors {@link OrangehrmAdminApi.loginAsAdmin} but takes explicit credentials so a
 * test can authenticate a dedicated {@link APIRequestContext} as an ESS / Supervisor user
 * (e.g. to self-apply leave via the API → Pending Approval). Reuses the context's cookies.
 */
export class AuthApi extends BaseApiService {
  async login(username: string, password: string): Promise<void> {
    const loginPage = await this.get('/web/index.php/auth/login', {
      headers: { Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
    });

    // Already authenticated — OrangeHRM redirects away from the login page.
    if (!loginPage.url().includes('/auth/login')) {
      log.info(`Session already active for context (${username})`);
      return;
    }

    const html = await loginPage.text();
    const match = html.match(/:token="&quot;([^"]+)&quot;"/);
    if (!match) {
      throw new Error('CSRF token not found in login page HTML');
    }

    const response = await this.post('/web/index.php/auth/validate', {
      form: { username, password, _token: match[1] },
    });

    const body = await response.text();
    if (!response.ok()) {
      log.error(`Login failed for ${username}`, { status: response.status() });
      throw new Error(`OrangeHRM login failed for ${username}: HTTP ${response.status()}`);
    }
    if (body.includes('Invalid credentials')) {
      throw new Error(`OrangeHRM login rejected: invalid credentials for ${username}`);
    }

    log.info(`Session established: ${username}`);
  }
}
