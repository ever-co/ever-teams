import { integrationService } from '@/core/services/client/api';
import { integrationState } from '@/core/stores';
import { useCallback } from 'react';
import { useAtom } from 'jotai';
import { useQuery } from '../common/use-query';

export function useIntegration() {
	const [integration, setIntegration] = useAtom(integrationState);

	const { loading: loading, queryCall: queryCall } = useQuery(integrationService.getIntegration);

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
