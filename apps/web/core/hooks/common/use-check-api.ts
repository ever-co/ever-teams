'use client';
import { ApiErrorService } from '@/core/services/client/api-error.service';

import React, { useCallback, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Logger } from '@/core/services/logs/logger.service';
import { LogLevel } from '@/core/types/generics/services';
import { queryKeys } from '@/core/query/keys';
import { getDefaultAPI } from '@/core/services/client/api/default';

export function useCheckAPI() {
	const [isApiWork, setIsApiWork] = React.useState(true);

	const logger = useMemo(() => Logger.getInstance(), []);

	const logApiCheckSuccess = useCallback(
		(response: any) => {
			logger.logToFile({
				level: LogLevel.INFO,
				message: `API CHECK SUCCESS with status code:  ${response.status} 🚀 ${response.data?.message || response.message} on ${response.config?.url}`,
				details: 'The API is working fine 🚀 🚀  please check the status code',
				context: '✅✅✅🚀 Check API',
				timestamp: new Date().toISOString()
			});
		},
		[logger]
	);

	const logApiCheckError = useCallback(
		(error: unknown) => {
			const apiErrorService = ApiErrorService.fromAxiosError(error);
			logger.logToFile({
				level: LogLevel.ERROR,
				message: apiErrorService?.message || 'API CHECK ERROR',
				details: apiErrorService?.details || 'An error occurred while checking the API',
				context: 'Check API',
				timestamp: new Date().toISOString()
			});
		},
		[logger]
	);

	const apiCheckQuery = useQuery({
		queryKey: queryKeys.apiCheck.health,
		queryFn: async () => {
			const response = await getDefaultAPI();
			return response;
		},
		retry: 3, // Retry failed health checks up to 3 times
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000) // Exponential backoff
	});

	useEffect(() => {
		if (apiCheckQuery.data) {
			logApiCheckSuccess(apiCheckQuery.data);
			setIsApiWork(apiCheckQuery.data.status === 200);
		}
	}, [apiCheckQuery.data, logApiCheckSuccess]);

	useEffect(() => {
		if (apiCheckQuery.error) {
			logApiCheckError(apiCheckQuery.error);
			setIsApiWork(false);
		}
	}, [apiCheckQuery.error, logApiCheckError]);

	return {
		isApiWork,
		loading: apiCheckQuery.isLoading
	};
}
