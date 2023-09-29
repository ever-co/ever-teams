import { installGitHubIntegrationAPI } from '@app/services/client/api/integrations/github';
import { userState } from '@app/stores';
import { useCallback } from 'react';
import { useRecoilState } from 'recoil';
import { useQuery } from '../useQuery';

export function useGitHubIntegration() {
	const [user] = useRecoilState(userState);

	const { loading: installLoading, queryCall: installQueryCall } = useQuery(
		installGitHubIntegrationAPI
	);

	const installGitHub = useCallback(
		(installation_id: string, setup_action: string) => {
			return installQueryCall({
				tenantId: user?.tenantId as string,
				organizationId: user?.employee?.organizationId as string,
				installation_id,
				setup_action,
			});
		},
		[installQueryCall, user]
	);

	return {
		installLoading,
		installQueryCall,
		installGitHub,
	};
}
