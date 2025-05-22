import { ITenant } from '@/core/types/interfaces/to-review';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';

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
}

export const tenantService = new TenantService(GAUZY_API_BASE_SERVER_URL.value);
