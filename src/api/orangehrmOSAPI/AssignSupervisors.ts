import { BaseApiService } from "../BaseApiService";
import { createLogger, logger } from '../../lib/logger';
import { env } from '../../../src/config/env';


const log = createLogger('ReportingMethodsApi');

export class AssignDerectSupervisors extends BaseApiService {

    async getAllSupervisors(empNumber: number | undefined): Promise<Array<{supervisor: {empNumber: number}}>> {
        const response = await this.get(`${env.baseURL}/web/index.php/api/v2/pim/employees/${empNumber}/supervisors`, {
            headers: { Accept: 'application/json' },
        })
        if (!response.ok()) {
            throw new Error(`Failed to fetch all supervisors for employee with employee Number ${empNumber} ` + response.status())
        }
        const result = await response.json() as { data: Array<{supervisor: {empNumber: number}}>};
        return result.data ?? [];

    }

    async createSupervisors(empNumber: number | undefined, supervisorNumber: number | undefined): Promise<void> {

        const allSupervisors = await this.getAllSupervisors(empNumber);

        
        if (allSupervisors.some(item => item.supervisor.empNumber === supervisorNumber)) {
            log.info(`Supervisor already exists, skipping: ${supervisorNumber}`);
            return;
        }

        await this.assignSupervisor(empNumber, supervisorNumber);
    }

    async assignSupervisor(empNumber: number | undefined, supervisorNumber: number | undefined): Promise<void> {

        const response = await this.post(`${env.baseURL}/web/index.php/api/v2/pim/employees/${empNumber}/supervisors`, {
            data: {
                "empNumber": supervisorNumber,
                "reportingMethodId": 2
            }

        })
        if (!response.ok()) {
            logger.info('Supervisor assigning failed')
            throw new Error(`Failed to add the the supervisor. ${response.status()}`)
        }
        logger.info('Successfully assigned the supervisor')
    }

}

