'use client';

import React, { useCallback, useEffect } from 'react';
import { useQuery } from './useQuery';
import { getDefaultAPI } from '@app/services/client/api';

export function useCheckAPI() {
	const { queryCall, loading } = useQuery(getDefaultAPI);
	const [isApiWork, setIsApiWork] = React.useState(true);

	const checkAPI = useCallback(async () => {
		const response = await queryCall();
		setIsApiWork(response.status == 200);
	}, [queryCall]);

	useEffect(() => {
		checkAPI();
	}, [checkAPI]);

	return {
		isApiWork,
		loading
	};
}
