import type { OrangehrmAdminApi } from '../../api/orangehrmOSAPI/OrangehrmAdminApi';
import { SkillsApi } from '../../api/orangehrmOSAPI/SkillsApi';
import { api } from '../../../test-data';

/** Creates skills via Skills API v2 (`api.skills`). Called after login via {@link seedAllMasterData}. */
export async function seedSkills(adminApi: OrangehrmAdminApi): Promise<void> {
  const skillsApi = new SkillsApi(adminApi.request);

  for (const row of api.skills.seedRecords) {
    await skillsApi.createIfAbsent(row);
  }
}
