'use client';

import React, { useCallback, useEffect } from 'react';
import { useQuery } from './useQuery';
import { getDefaultAPI } from '@app/services/client/api';

export function useCheckAPI() {
	const { queryCall } = useQuery(getDefaultAPI);
	const [isApiWork, setIsApiWork] = React.useState(true);

	const checkAPI = useCallback(() => {
		queryCall()
			.then(() => {
				setIsApiWork(true);
			})
			.catch(() => {
				setIsApiWork(false);
			});
	}, [queryCall]);

	useEffect(() => {
		checkAPI();
	}, [checkAPI]);

	return {
		isApiWork
	};
}
