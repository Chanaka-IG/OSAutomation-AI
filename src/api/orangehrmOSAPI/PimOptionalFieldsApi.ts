import type { OptionalFieldsConfig } from '../../../test-data/pim/api/optionalFields';
import { optionalFields as optionalFieldsData } from '../../../test-data/pim/api/optionalFields';
import { createLogger } from '../../lib/logger';
import { BaseApiService } from '../BaseApiService';

const log = createLogger('PimOptionalFieldsApi');

/**
 * OrangeHRM PIM API v2 — Optional Fields configuration (PIM → Configuration → Optional Fields).
 * Instance-wide boolean singleton: `GET`/`PUT /api/v2/pim/optional-field`.
 * Used by the optional-fields suite to snapshot/restore the shared config and to verify saves.
 */
export class PimOptionalFieldsApi extends BaseApiService {
  async getConfig(): Promise<OptionalFieldsConfig> {
    const response = await this.get(optionalFieldsData.adminPath, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok()) {
      throw new Error(`PimOptionalFieldsApi.getConfig failed: HTTP ${response.status()}`);
    }
    const json = (await response.json()) as { data: OptionalFieldsConfig };
    return json.data;
  }

  async setConfig(config: OptionalFieldsConfig): Promise<void> {
    const response = await this.put(optionalFieldsData.adminPath, {
      data: config,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok()) {
      const text = await response.text();
      log.error('Failed to update PIM optional-field config', {
        status: response.status(),
        body: text.slice(0, 400),
      });
      throw new Error(
        `PimOptionalFieldsApi.setConfig failed: HTTP ${response.status()}\n${text.slice(0, 600)}`,
      );
    }
    log.info(`PIM optional-field config updated: ${JSON.stringify(config)}`);
  }
}
