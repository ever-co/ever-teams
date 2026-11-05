import qs from 'qs';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { validateApiResponse } from '@/core/types/schemas';
import {
	myProjectRatesSchema,
	projectRatesSchema,
	rateChangeRequestResultSchema,
	type IEmployeeRatesInput,
	type IRateChangeRequestInput,
	type TMyProjectRate,
	type TProjectRates,
	type TRateChangeRequestResult
} from '@/core/types/schemas/organization/rates.schema';

/**
 * Rates: an employee's own rate (`PUT /employee/:id`), a project's rate and each member's rate on it, the caller's
 * effective rates per project, and the rate change request an employee sends to the organization's admins.
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

	updateProjectRate = async (projectId: string, billRateValue: number | null): Promise<void> => {
		await this.put(`/organization-projects/${encodeURIComponent(projectId)}/rate`, {
			organizationId: this.organizationId,
			billRateValue
		});
	};

	updateProjectMemberRate = async (
		projectId: string,
		employeeId: string,
		billRateValue: number | null
	): Promise<void> => {
		const projectSegment = encodeURIComponent(projectId);
		const employeeSegment = encodeURIComponent(employeeId);
		await this.put(`/organization-projects/${projectSegment}/members/${employeeSegment}/rate`, {
			organizationId: this.organizationId,
			billRateValue
		});
	};

	getMyProjectRates = async (): Promise<TMyProjectRate[]> => {
		const query = qs.stringify({ organizationId: this.organizationId, tenantId: this.tenantId });
		const response = await this.get<TMyProjectRate[]>(`/organization-projects/rates/me?${query}`, {
			tenantId: this.tenantId
		});
		return validateApiResponse(myProjectRatesSchema, response.data, 'getMyProjectRates API response');
	};

	requestRateChange = async (input: IRateChangeRequestInput): Promise<TRateChangeRequestResult> => {
		const response = await this.post<TRateChangeRequestResult>('/employee/rate-change-request', {
			...input,
			organizationId: this.organizationId
		});
		const result = response.data ?? {};
		return validateApiResponse(rateChangeRequestResultSchema, result, 'requestRateChange API response');
	};

	updateEmployeeRates = async (employeeId: string, rates: IEmployeeRatesInput): Promise<void> => {
		await this.put(`/employee/${encodeURIComponent(employeeId)}`, {
			organizationId: this.organizationId,
			tenantId: this.tenantId,
			...rates
		});
	};
}

export const rateService = new RateService(GAUZY_API_BASE_SERVER_URL.value);
