import { getIntegrationTypesAPI } from '@app/services/client/api';
import { integrationTypesState } from '@app/stores';
import { useCallback } from 'react';
import { useRecoilState } from 'recoil';
import { useQuery } from '../useQuery';

export function useIntegrationTypes() {
	const [integrationTypes, setIntegrationTypes] = useRecoilState(integrationTypesState);

	const { loading: loading, queryCall: queryCall } = useQuery(getIntegrationTypesAPI);

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
