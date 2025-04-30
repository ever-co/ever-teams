import { getIntegrationTypesAPI } from '@app/services/client/api';
import { integrationTypesState } from '@app/stores';
import { useCallback } from 'react';
import { useAtom } from 'jotai';
import { useQuery } from '../useQuery';

export function useIntegrationTypes() {
  const [integrationTypes, setIntegrationTypes] = useAtom(
    integrationTypesState
  );

  const { loading: loading, queryCall: queryCall } = useQuery(
    getIntegrationTypesAPI
  );

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
