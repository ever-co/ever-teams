import { APIService } from '../../api.service';
import { type ApiRequestScope, scopedWriteConfig } from '../../api-request-scope';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { ITenant } from '@/core/types/interfaces/tenant/tenant';

class TenantService extends APIService {
	createTenant = async (name: string, bearer_token: string) => {
		return this.post<ITenant>(
			'/tenant',
			{ name },
			{
				headers: { Authorization: `Bearer ${bearer_token}` }
			}
		).then(({ data }) => data);
	};

	/**
	 * Renames a tenant, the name the workspace switcher shows. Gauzy renames the tenant of the token it receives and
	 * lets its super admin alone do it, so the request goes out with the token of the workspace the page was showing:
	 * another tab may have moved the session to another workspace since. In proxy mode the token is the session's, and
	 * the route refuses a tenant that is not that session's.
	 */
	renameTenant = async (name: string, workspace: ApiRequestScope): Promise<void> => {
		const body = { name, tenantId: workspace.tenantId };
		await this.put('/tenant', body, scopedWriteConfig(workspace));
	};
}

export const tenantService = new TenantService(GAUZY_API_BASE_SERVER_URL.value);
