import { emailResetService } from '../../services/client/api/';
import { useQuery } from '../useQuery';

export const useEmailReset = () => {
	const { queryCall: emailResetRequestQueryCall, loading: emailResetRequestLoading } = useQuery(
		emailResetService.emailResetRequestAPI
	);

	const { queryCall: verifyChangeEmailRequestQueryCall, loading: verifyChangeEmailRequestLoading } = useQuery(
		emailResetService.verifyChangeEmailRequestAPI
	);

	return {
		emailResetRequestQueryCall,
		emailResetRequestLoading,
		verifyChangeEmailRequestQueryCall,
		verifyChangeEmailRequestLoading
	};
};
