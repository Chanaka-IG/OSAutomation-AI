import { createLogger } from '../../lib/logger';
import { BaseApiService } from '../BaseApiService';

const log = createLogger('CandidatesApi');

const CANDIDATES_PATH = '/web/index.php/api/v2/recruitment/candidates';

export type CandidateSeed = {
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  contactNumber?: string;
  vacancyId: number;
  dateOfApplication: string;
  keywords?: string;
  comment?: string;
  consentToKeepData: boolean;
};

export type ScheduleInterviewOpts = {
  interviewName: string;
  interviewerEmpNumber: number;
  interviewDate: string;
  note?: string;
};

export class CandidatesApi extends BaseApiService {
  async create(payload: CandidateSeed): Promise<number> {
    const res = await this.post(CANDIDATES_PATH, {
      data: {
        firstName: payload.firstName,
        middleName: payload.middleName ?? '',
        lastName: payload.lastName,
        email: payload.email,
        contactNumber: payload.contactNumber ?? '',
        vacancyId: payload.vacancyId,
        dateOfApplication: payload.dateOfApplication,
        keywords: payload.keywords ?? '',
        comment: payload.comment ?? '',
        consentToKeepData: payload.consentToKeepData,
      },
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    });

    if (!res.ok()) {
      const text = await res.text();
      throw new Error(
        `CandidatesApi.create failed: HTTP ${res.status()} for "${payload.firstName} ${payload.lastName}"\n${text.slice(0, 600)}`,
      );
    }

    const json = (await res.json()) as { data: { id: number } };
    log.info(`Candidate created: "${payload.firstName} ${payload.lastName}" (id=${json.data.id})`);
    return json.data.id;
  }

  async shortlist(candidateId: number, note = ''): Promise<void> {
    const res = await this.put(`${CANDIDATES_PATH}/${candidateId}/shortlist`, {
      data: { note },
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    });
    if (!res.ok()) throw new Error(`CandidatesApi.shortlist failed: HTTP ${res.status()} for candidate ${candidateId}`);
    log.info(`Candidate ${candidateId} shortlisted`);
  }

  async scheduleInterview(candidateId: number, opts: ScheduleInterviewOpts): Promise<number> {
    const res = await this.post(`${CANDIDATES_PATH}/${candidateId}/shedule-interview`, {
      data: {
        interviewName: opts.interviewName,
        interviewerEmpNumbers: [opts.interviewerEmpNumber],
        interviewDate: opts.interviewDate,
        note: opts.note ?? '',
      },
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    });
    if (!res.ok()) {
      const text = await res.text();
      throw new Error(`CandidatesApi.scheduleInterview failed: HTTP ${res.status()} for candidate ${candidateId}\n${text.slice(0, 400)}`);
    }
    const json = (await res.json()) as { data: { id: number } };
    log.info(`Candidate ${candidateId} interview scheduled (interviewId=${json.data.id})`);
    return json.data.id;
  }

  async passInterview(candidateId: number, interviewId: number, note = ''): Promise<void> {
    const res = await this.put(`${CANDIDATES_PATH}/${candidateId}/interviews/${interviewId}/pass`, {
      data: { note },
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    });
    if (!res.ok()) throw new Error(`CandidatesApi.passInterview failed: HTTP ${res.status()} for candidate ${candidateId}`);
    log.info(`Candidate ${candidateId} interview ${interviewId} passed`);
  }

  async failInterview(candidateId: number, interviewId: number, note = ''): Promise<void> {
    const res = await this.put(`${CANDIDATES_PATH}/${candidateId}/interviews/${interviewId}/fail`, {
      data: { note },
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    });
    if (!res.ok()) throw new Error(`CandidatesApi.failInterview failed: HTTP ${res.status()} for candidate ${candidateId}`);
    log.info(`Candidate ${candidateId} interview ${interviewId} failed`);
  }

  async offerJob(candidateId: number, note = ''): Promise<void> {
    const res = await this.put(`${CANDIDATES_PATH}/${candidateId}/job/offer`, {
      data: { note },
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    });
    if (!res.ok()) throw new Error(`CandidatesApi.offerJob failed: HTTP ${res.status()} for candidate ${candidateId}`);
    log.info(`Candidate ${candidateId} job offered`);
  }

  async hire(candidateId: number, note = ''): Promise<void> {
    const res = await this.put(`${CANDIDATES_PATH}/${candidateId}/hire`, {
      data: { note },
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    });
    if (!res.ok()) throw new Error(`CandidatesApi.hire failed: HTTP ${res.status()} for candidate ${candidateId}`);
    log.info(`Candidate ${candidateId} hired`);
  }

  async reject(candidateId: number, note = ''): Promise<void> {
    const res = await this.put(`${CANDIDATES_PATH}/${candidateId}/reject`, {
      data: { note },
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    });
    if (!res.ok()) throw new Error(`CandidatesApi.reject failed: HTTP ${res.status()} for candidate ${candidateId}`);
    log.info(`Candidate ${candidateId} rejected`);
  }

  async declineOffer(candidateId: number, note = ''): Promise<void> {
    const res = await this.put(`${CANDIDATES_PATH}/${candidateId}/job/decline`, {
      data: { note },
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    });
    if (!res.ok()) throw new Error(`CandidatesApi.declineOffer failed: HTTP ${res.status()} for candidate ${candidateId}`);
    log.info(`Candidate ${candidateId} offer declined`);
  }

  async getEmpNumberByName(firstName: string, lastName: string): Promise<number | undefined> {
    const res = await this.get(
      `/web/index.php/api/v2/pim/employees?firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}&limit=1`,
      { headers: { Accept: 'application/json' } },
    );
    if (!res.ok()) return undefined;
    const json = (await res.json()) as { data: Array<{ empNumber: number }> };
    return json.data?.[0]?.empNumber;
  }

  async deleteCandidates(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    const res = await this.delete(CANDIDATES_PATH, {
      data: { ids },
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    });
    if (!res.ok()) {
      const text = await res.text();
      log.warn(
        `CandidatesApi.deleteCandidates partial failure: HTTP ${res.status()} ${text.slice(0, 200)}`,
      );
    } else {
      log.info(`Candidates deleted: [${ids.join(', ')}]`);
    }
  }
}
