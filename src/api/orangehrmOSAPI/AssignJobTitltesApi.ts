import { BaseApiService } from "../BaseApiService";
import { createLogger, logger } from '../../lib/logger';
import { env } from '../../config/env';


const log = createLogger('AssignJobTitles');

export class AssignJobTitlesApi extends BaseApiService {

    async assignJobTitles(empNumber: number | undefined, jobTitleID: number | undefined, jobTitle: string): Promise<void> {

        const response = await this.put(`${env.baseURL}/web/index.php/api/v2/pim/employees/${empNumber}/job-details`, {
            data: {
                jobTitleId: jobTitleID
            }

        })
        if (!response.ok()) {
            logger.info('Job titles assigning failed'+ await response.text())
            throw new Error(`Failed to add the the Job titles. ${response.status()}`)
        }
        logger.info('Successfully assigned the Job titles')
    }

}

