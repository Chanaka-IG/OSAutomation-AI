import type { LocationSeed } from '../../../test-data/pim/api/locations';
import { locations as locationsData } from '../../../test-data/pim/api/locations';
import { createLogger } from '../../lib/logger';
import { BaseApiService } from '../BaseApiService';

const log = createLogger('LocationsApi');

/**
 * OrangeHRM Admin API v2 — locations.
 * Uses relative {@link locationsData.adminPath}; host is `orangehrmApiContext` `baseURL`
 * (= {@link locationsData.orangehrmBaseURL} / `BASE_URL`). Full URL: {@link locationsData.adminUrl}.
 */
export class LocationsApi extends BaseApiService {
  async create(payload: LocationSeed): Promise<void> {
    const response = await this.post(locationsData.adminPath, {
      data: {
        name: payload.name,
        countryCode: payload.countryCode,
        province: payload.province,
        city: payload.city,
        address: payload.address,
        zipCode: payload.zipCode,
        phone: payload.phone,
        fax: payload.fax,
        note: payload.note,
      },
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok()) {
      const text = await response.text();
      log.error(`Failed to add location: ${payload.name}`, {
        status: response.status(),
        body: text.slice(0, 400),
      });
      throw new Error(
        `LocationsApi.create failed: HTTP ${response.status()} ${payload.name}\n${text.slice(0, 600)}`,
      );
    }

    log.info(`Location successfully added: ${payload.name}`);
  }
}
