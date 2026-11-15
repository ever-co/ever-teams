import qs from 'qs';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { validateApiResponse } from '@/core/types/schemas';
import {
	employeePayRateSchema,
	projectRatesSchema,
	rateChangeRequestResultSchema,
	rateSaveAnswerSchema,
	type IEmployeeRatesInput,
	type IOwnProfileRatesInput,
	type IRateChangeRequestInput,
	type RateSaveOutcome,
	type TEmployeePayRate,
	type TProjectRates,
	type TRateChangeRequestResult
} from '@/core/types/schemas/organization/rates.schema';

/** The count of entries a save re-priced, read leniently: an answer without one (an older Gauzy) saved all the same. */
function rateSaveOutcomeOf(answer: unknown): RateSaveOutcome {
	const parsed = rateSaveAnswerSchema.safeParse(answer ?? {});
	if (!parsed.success) {
		return { repricedTimeLogs: null };
	}
	return { repricedTimeLogs: parsed.data.repricedTimeLogs ?? null };
}

/** Sent only when a day is picked: a Gauzy without the field then answers exactly as before. */
function applyFromFieldOf(applyFrom: string | undefined): { applyFrom?: string } {
	if (!applyFrom) {
		return {};
	}
	return { applyFrom };
}

/**
 * Rates: an employee's billing and pay rates (`PUT /employee/:id`), the pay rate read, the client rates of a project
 * and of each member on it, and the rate change request an employee sends to the organization's admins. A save may
 * name the day its new rate prices tracked time from, and answers how many entries took it.
 */
class RateService extends APIService {
	getProjectRates = async (projectId: string): Promise<TProjectRates> => {
		const query = qs.stringify({ organizationId: this.organizationId, tenantId: this.tenantId });
		const response = await this.get<TProjectRates>(
			`/organization-projects/${encodeURIComponent(projectId)}/rates?${query}`,
			{ tenantId: this.tenantId }
		);
		return validateApiResponse(projectRatesSchema, response.data, 'getProjectRates API response');
	};

	updateProjectRate = async (
		projectId: string,
		billRateValue: number | null,
		applyFrom?: string
	): Promise<RateSaveOutcome> => {
		const response = await this.put(`/organization-projects/${encodeURIComponent(projectId)}/rate`, {
			organizationId: this.organizationId,
			billRateValue,
			...applyFromFieldOf(applyFrom)
		});
		return rateSaveOutcomeOf(response?.data);
	};

	updateProjectMemberRate = async (
		projectId: string,
		employeeId: string,
		billRateValue: number | null,
		applyFrom?: string
	): Promise<RateSaveOutcome> => {
		const projectSegment = encodeURIComponent(projectId);
		const employeeSegment = encodeURIComponent(employeeId);
		const response = await this.put(`/organization-projects/${projectSegment}/members/${employeeSegment}/rate`, {
			organizationId: this.organizationId,
			billRateValue,
			...applyFromFieldOf(applyFrom)
		});
		return rateSaveOutcomeOf(response?.data);
	};

	getEmployeePayRate = async (employeeId: string): Promise<TEmployeePayRate> => {
		const query = qs.stringify({ organizationId: this.organizationId, tenantId: this.tenantId });
		const response = await this.get<TEmployeePayRate>(
			`/employee/${encodeURIComponent(employeeId)}/pay-rate?${query}`,
			{ tenantId: this.tenantId }
		);
		return validateApiResponse(employeePayRateSchema, response.data, 'getEmployeePayRate API response');
	};

	requestRateChange = async (input: IRateChangeRequestInput): Promise<TRateChangeRequestResult> => {
		const response = await this.post<TRateChangeRequestResult>('/employee/rate-change-request', {
			...input,
			organizationId: this.organizationId
		});
		const result = response.data ?? {};
		return validateApiResponse(rateChangeRequestResultSchema, result, 'requestRateChange API response');
	};

	updateOwnProfileRates = async (employeeId: string, rates: IOwnProfileRatesInput): Promise<RateSaveOutcome> => {
		const response = await this.put(`/employee/${encodeURIComponent(employeeId)}/profile`, {
			organizationId: this.organizationId,
			tenantId: this.tenantId,
			...rates
		});
		return rateSaveOutcomeOf(response?.data);
	};

	updateEmployeeRates = async (employeeId: string, rates: IEmployeeRatesInput): Promise<RateSaveOutcome> => {
		const response = await this.put(`/employee/${encodeURIComponent(employeeId)}`, {
			organizationId: this.organizationId,
			tenantId: this.tenantId,
			...rates
		});
		return rateSaveOutcomeOf(response?.data);
	};
}

export const rateService = new RateService(GAUZY_API_BASE_SERVER_URL.value);
