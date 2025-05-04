import { integrationTypesState } from '@/core/stores';
import { useCallback } from 'react';
import { useAtom } from 'jotai';
import { useQuery } from '../useQuery';
import { integrationService } from '@/core/services/client/api';

export function useIntegrationTypes() {
	const [integrationTypes, setIntegrationTypes] = useAtom(integrationTypesState);

	const { loading: loading, queryCall: queryCall } = useQuery(integrationService.getIntegrationTypes);

	const getIntegrationTypes = useCallback(() => {
		return queryCall().then((response) => {
			setIntegrationTypes(response.data);

			return response.data;
		});
	}, [queryCall, setIntegrationTypes]);

	return {
		loading,
		getIntegrationTypes,
		integrationTypes
	};
}
