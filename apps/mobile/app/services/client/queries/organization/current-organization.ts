import { useQuery } from '@tanstack/react-query';
import { getOrganizationRequest } from '../../requests/organization';

interface ICurrentOrganizationParams {
	authToken: string;
	tenantId: string;
	organizationId: string;
	/** Read only while a screen needs the organization's rules (a timer runs). */
	enabled?: boolean;
}

// The organization's rules change rarely: every timer view mounts a reader, so it is not fetched again on each mount
const ORGANIZATION_STALE_TIME = 5 * 60 * 1000;

const fetchOrganization = async ({ authToken, tenantId, organizationId }: ICurrentOrganizationParams) => {
	const { data, response } = await getOrganizationRequest({ organizationId, tenantId }, authToken);
	// A refusal's body is no organization: the query fails instead of reporting one without its rules
	const isOrganization = !!data && typeof data === 'object' && data.id === organizationId;
	if (!response.ok || !isOrganization) {
		throw new Error(`Failed to fetch the organization: ${response.status}`);
	}
	return data;
};

/**
 * The organization the person works in, as `GET /organization/:id` answers it.
 *
 * Keyed on the tenant and the organization, so a switch of workspace never reads another one's cached answer.
 */
export const currentOrganizationQueryKey = (tenantId: string, organizationId: string) =>
	['organization', tenantId, organizationId] as const;

const useCurrentOrganization = (params: ICurrentOrganizationParams) => {
	const hasSession = !!params.authToken && !!params.tenantId && !!params.organizationId;
	const isWanted = params.enabled ?? true;

	return useQuery({
		queryKey: currentOrganizationQueryKey(params.tenantId, params.organizationId),
		queryFn: () => fetchOrganization(params),
		enabled: hasSession && isWanted,
		staleTime: ORGANIZATION_STALE_TIME
	});
};

export default useCurrentOrganization;
