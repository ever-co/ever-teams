import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { APIService } from '../api.service';

export interface AppVersionInfo {
	name: string;
	version: string;
	commit: string;
}

class AppVersionService extends APIService {
	getVersion = async (): Promise<AppVersionInfo> => {
		const response = await this.get<AppVersionInfo>('/version');
		return response.data;
	};
}

export const appVersionService = new AppVersionService(GAUZY_API_BASE_SERVER_URL.value, { timeout: 5_000 });
