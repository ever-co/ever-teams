import { GAUZY_API_SERVER_URL, IS_DESKTOP_APP } from '@/core/constants/config/constants';
import { IServerRuntimeConfig } from '@/core/types/interfaces/common/runtime-server-config';

export function getDesktopConfig(): Partial<IServerRuntimeConfig> {
	// Next.js 16: serverRuntimeConfig removed, use environment variables instead
	if (IS_DESKTOP_APP) {
		return {
			GAUZY_API_SERVER_URL: process.env.GAUZY_API_SERVER_URL || GAUZY_API_SERVER_URL
		};
	}
	return {}
}
