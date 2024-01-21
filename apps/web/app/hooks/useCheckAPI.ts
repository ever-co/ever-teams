'use client';

import React, { useCallback, useEffect } from 'react';
import { useQuery } from './useQuery';
import { getDefaultAPI } from '@app/services/client/api';

export function useCheckAPI() {
	const { queryCall } = useQuery(getDefaultAPI);
	const [isApiWork, setIsApiWork] = React.useState(true);

	const checkAPI = useCallback(() => {
		queryCall().then((res) => {
			if (res?.data?.data?.status == 200 || res.status == 200) setIsApiWork(true);
			else setIsApiWork(false);
		});
	}, [queryCall]);

	useEffect(() => {
		checkAPI();
	}, [checkAPI]);

	return {
		isApiWork
	};
}
