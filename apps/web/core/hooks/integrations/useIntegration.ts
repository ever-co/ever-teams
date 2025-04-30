import { getIntegrationAPI } from '@/core/services/client/api';
import { integrationState } from '@/core/stores';
import { useCallback } from 'react';
import { useAtom } from 'jotai';
import { useQuery } from '../useQuery';

export function useIntegration() {
	const [integration, setIntegration] = useAtom(integrationState);

	const { loading: loading, queryCall: queryCall } = useQuery(getIntegrationAPI);

	const getIntegration = useCallback(
		(name: string) => {
			return queryCall(name).then((response) => {
				setIntegration(response.data);

				return response.data;
			});
		},
		[queryCall, setIntegration]
	);

	return {
		loading,
		getIntegration,
		integration
	};
}
