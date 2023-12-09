import { healthCheckAPI } from '@app/services/client/api/health';
import { useCallback, useRef } from 'react';
import { useQuery } from '../useQuery';

export const useHealthCheck = () => {
	const apiHealthRef = useRef(true);

	const { queryCall: queryCall, loading: loading, loadingRef: loadingRef } = useQuery(healthCheckAPI);

	const getHealthCheck = useCallback(() => {
		queryCall()
			.then((data) => {
				if (data.data.status !== 'ok') {
					apiHealthRef.current = false;
					return;
				}
				apiHealthRef.current = true;
			})
			.catch(() => {
				apiHealthRef.current = false;
			});
	}, [queryCall]);

	return {
		getHealthCheck,
		loading,
		loadingRef
	};
};
