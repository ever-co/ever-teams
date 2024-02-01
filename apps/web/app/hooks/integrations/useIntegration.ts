import { getIntegrationAPI } from '@app/services/client/api';
import { integrationState } from '@app/stores';
import { useCallback } from 'react';
import { useRecoilState } from 'recoil';
import { useQuery } from '../useQuery';

export function useIntegration() {
	const [integration, setIntegration] = useRecoilState(integrationState);

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
