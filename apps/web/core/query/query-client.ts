import { QueryClient } from '@tanstack/react-query';

export const createQueryClientInstance = () =>
	new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 1000 * 60 * 5, // 5 minutes
				refetchOnWindowFocus: false,
				retry: 1
			}
		}
	});
