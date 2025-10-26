import { GAUZY_API_SERVER_URL, GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { IServerRuntimeConfig } from '@/core/types/interfaces/common/runtime-server-config';

export function getDesktopConfig(): Partial<IServerRuntimeConfig> {
	// Next.js 16: serverRuntimeConfig removed, use environment variables instead
	return {
		GAUZY_API_SERVER_URL: process.env.GAUZY_API_SERVER_URL || GAUZY_API_SERVER_URL,
		NEXT_PUBLIC_GAUZY_API_SERVER_URL: process.env.NEXT_PUBLIC_GAUZY_API_SERVER_URL || GAUZY_API_BASE_SERVER_URL.value
	};
}
