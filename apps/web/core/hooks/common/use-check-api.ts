'use client';

import React, { useCallback, useEffect } from 'react';
import { useQuery } from './use-query';
import { getDefaultAPI } from '@/core/services/client/api';

export function useCheckAPI() {
	const { queryCall, loading } = useQuery(getDefaultAPI);
	const [isApiWork, setIsApiWork] = React.useState(true);

	const checkAPI = useCallback(async () => {
		try {
			const response = await queryCall();
			const status = response.status;
			setIsApiWork(status == 200);
		} catch (error) {
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
