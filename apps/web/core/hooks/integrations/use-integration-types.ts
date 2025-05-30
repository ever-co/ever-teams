import { integrationTypesState } from '@/core/stores';
import { useCallback } from 'react';
import { useAtom } from 'jotai';
import { useQueryCall } from '../common/use-query';
import { integrationService } from '@/core/services/client/api';

export function useIntegrationTypes() {
	const [integrationTypes, setIntegrationTypes] = useAtom(integrationTypesState);

	const { loading, queryCall } = useQueryCall(integrationService.getIntegrationTypes);

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
