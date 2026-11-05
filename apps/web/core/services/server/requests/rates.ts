import qs from 'qs';
import { serverFetch } from '../fetch';
import type {
	IRateChangeRequestInput,
	TEmployeePayRate,
	TProjectRates,
	TRateChangeRequestResult
} from '@/core/types/schemas/organization/rates.schema';

interface IGauzyCall {
	bearer_token: string;
	tenantId: string;
	organizationId: string;
}

export function getProjectRatesRequest({
	projectId,
	organizationId,
	bearer_token,
	tenantId
}: IGauzyCall & { projectId: string }) {
	const query = qs.stringify({ organizationId, tenantId });
	return serverFetch<TProjectRates>({
		path: `/organization-projects/${encodeURIComponent(projectId)}/rates?${query}`,
		method: 'GET',
		bearer_token,
		tenantId
	});
}

export function updateProjectRateRequest({
	projectId,
	billRateValue,
	organizationId,
	bearer_token,
	tenantId
}: IGauzyCall & { projectId: string; billRateValue: number | null }) {
	return serverFetch<TProjectRates>({
		path: `/organization-projects/${encodeURIComponent(projectId)}/rate`,
		method: 'PUT',
		body: { organizationId, tenantId, billRateValue },
		bearer_token,
		tenantId
	});
}

export function updateProjectMemberRateRequest({
	projectId,
	employeeId,
	billRateValue,
	organizationId,
	bearer_token,
	tenantId
}: IGauzyCall & { projectId: string; employeeId: string; billRateValue: number | null }) {
	const projectSegment = encodeURIComponent(projectId);
	const employeeSegment = encodeURIComponent(employeeId);
	return serverFetch<{ organizationProjectId: string; employeeId: string; billRateValue: number | string | null }>({
		path: `/organization-projects/${projectSegment}/members/${employeeSegment}/rate`,
		method: 'PUT',
		body: { organizationId, tenantId, billRateValue },
		bearer_token,
		tenantId
	});
}

export function getEmployeePayRateRequest({
	employeeId,
	organizationId,
	bearer_token,
	tenantId
}: IGauzyCall & { employeeId: string }) {
	const query = qs.stringify({ organizationId, tenantId });
	return serverFetch<TEmployeePayRate>({
		path: `/employee/${encodeURIComponent(employeeId)}/pay-rate?${query}`,
		method: 'GET',
		bearer_token,
		tenantId
	});
}

export function requestRateChangeRequest({
	input,
	organizationId,
	bearer_token,
	tenantId
}: IGauzyCall & { input: IRateChangeRequestInput }) {
	return serverFetch<TRateChangeRequestResult>({
		path: '/employee/rate-change-request',
		method: 'POST',
		body: { ...input, organizationId, tenantId },
		bearer_token,
		tenantId
	});
}
