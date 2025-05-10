'use client';
import { ApiErrorService } from '@/core/services/client/api-error.service';

import React, { useCallback, useEffect } from 'react';
import { useQuery } from './use-query';
import { getDefaultAPI } from '@/core/services/client/api';
import { Logger } from '@/core/services/logs/logger.service';
import { LogLevel } from '@/core/types/generics/services';

export function useCheckAPI() {
	const { queryCall, loading } = useQuery(getDefaultAPI);
	const [isApiWork, setIsApiWork] = React.useState(true);
	const logger = Logger.getInstance();
	const checkAPI = useCallback(async () => {
		try {
			const response = await queryCall();
			const status = response?.status;
			const message = response?.data?.message || (response as any)?.message;

			logger.logToFile({
				level: LogLevel.INFO,
				message: `API CHECK SUCCESS with status code:  ${status} 🚀 ${message} on ${response?.config?.url}`,
				details: 'The API is working fine 🚀 🚀  please check the status code',
				context: '✅✅✅🚀 Check API',
				timestamp: new Date().toISOString()
			});
			setIsApiWork(status == 200);
		} catch (error) {
			const apiErrorService = ApiErrorService.fromAxiosError(error);
			logger.logToFile({
				level: LogLevel.ERROR,
				message: apiErrorService?.message || 'API CHECK ERROR',
				details: apiErrorService?.details || 'An error occurred while checking the API',
				context: 'Check API',
				timestamp: new Date().toISOString()
			});
			setIsApiWork(false);
		}
	}, [queryCall]);

	useEffect(() => {
		checkAPI();
	}, [checkAPI]);

	return {
		isApiWork,
		loading
	};
}
