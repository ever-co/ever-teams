import {
	installGitHubIntegrationAPI,
	oAuthEndpointAuthorizationAPI,
} from '@app/services/client/api/integrations/github';
import { userState } from '@app/stores';
import { useCallback } from 'react';
import { useRecoilState } from 'recoil';
import { useQuery } from '../useQuery';

export function useGitHubIntegration() {
	const [user] = useRecoilState(userState);

	const { loading: installLoading, queryCall: installQueryCall } = useQuery(
		installGitHubIntegrationAPI
	);
	const { loading: oAuthLoading, queryCall: oAuthQueryCall } = useQuery(
		oAuthEndpointAuthorizationAPI
	);

	const installGitHub = useCallback(
		(installation_id: string, setup_action: string, code: string) => {
			return installQueryCall({
				tenantId: user?.tenantId as string,
				organizationId: user?.employee?.organizationId as string,
				installation_id,
				setup_action,
				code,
			});
		},
		[installQueryCall, user]
	);
	const oAuthGitHub = useCallback(
		(installation_id: string, setup_action: string, code: string) => {
			return oAuthQueryCall({
				tenantId: user?.tenantId as string,
				organizationId: user?.employee?.organizationId as string,
				installation_id,
				setup_action,
				code,
			});
		},
		[oAuthQueryCall, user]
	);

	return {
		installLoading,
		installQueryCall,
		installGitHub,
		oAuthLoading,
		oAuthQueryCall,
		oAuthGitHub,
	};
}
