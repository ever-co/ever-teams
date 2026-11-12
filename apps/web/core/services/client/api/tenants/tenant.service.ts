import { APIService } from '../../api.service';
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
	 * Renames the tenant of the session, the name the workspace switcher shows. Gauzy reads which tenant from the
	 * session and lets its super admin alone rename it.
	 */
	renameTenant = async (name: string): Promise<void> => {
		await this.put('/tenant', { name }, { tenantId: this.tenantId });
	};
}

export const tenantService = new TenantService(GAUZY_API_BASE_SERVER_URL.value);
