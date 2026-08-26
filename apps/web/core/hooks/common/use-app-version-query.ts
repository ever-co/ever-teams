'use client';

import { useQuery } from '@tanstack/react-query';
import { appVersionService } from '@/core/services/client/api/app-version.service';

export function useAppVersionQuery() {
	return useQuery({
		queryKey: ['app-version'],
		queryFn: () => appVersionService.getVersion(),
		staleTime: Infinity,
		gcTime: Infinity,
		retry: false,
		refetchOnMount: false,
		refetchOnReconnect: false,
		refetchOnWindowFocus: false
	});
}
