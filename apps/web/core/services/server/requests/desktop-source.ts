import getConfig from 'next/config';
import { GAUZY_API_SERVER_URL, GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { IServerRuntimeConfig } from '@/core/types/interfaces/common/runtime-server-config';

export function getDesktopConfig(): Partial<IServerRuntimeConfig> {
	try {
		const { serverRuntimeConfig } = getConfig();
		return serverRuntimeConfig;
	} catch (error) {
		console.log('skip get server runtime config');
		return {
			GAUZY_API_SERVER_URL,
			NEXT_PUBLIC_GAUZY_API_SERVER_URL: GAUZY_API_BASE_SERVER_URL.value
		};
	}
}
