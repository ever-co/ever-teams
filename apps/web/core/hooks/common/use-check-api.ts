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

	const logApiCheckSuccess = (response: any) => {
		logger.logToFile({
			level: LogLevel.INFO,
			message: `API CHECK SUCCESS with status code:  ${response.status} 🚀 ${response.data?.message || response.message} on ${response.config?.url}`,
			details: 'The API is working fine 🚀 🚀  please check the status code',
			context: '✅✅✅🚀 Check API',
			timestamp: new Date().toISOString()
		});
	};

	const logApiCheckError = (error: any) => {
		const apiErrorService = ApiErrorService.fromAxiosError(error);
		logger.logToFile({
			level: LogLevel.ERROR,
			message: apiErrorService?.message || 'API CHECK ERROR',
			details: apiErrorService?.details || 'An error occurred while checking the API',
			context: 'Check API',
			timestamp: new Date().toISOString()
		});
	};

	const checkAPI = useCallback(async () => {
		try {
			const response = await queryCall();
			logApiCheckSuccess(response);
			setIsApiWork(response.status === 200);
		} catch (error) {
			logApiCheckError(error);
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
