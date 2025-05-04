import { emailResetService } from '../../services/client/api/';
import { useQuery } from '../useQuery';

export const useEmailReset = () => {
	const { queryCall: emailResetRequestQueryCall, loading: emailResetRequestLoading } = useQuery(
		emailResetService.resetEmail
	);

	const { queryCall: verifyChangeEmailRequestQueryCall, loading: verifyChangeEmailRequestLoading } = useQuery(
		emailResetService.verifyChangeEmail
	);

	return {
		emailResetRequestQueryCall,
		emailResetRequestLoading,
		verifyChangeEmailRequestQueryCall,
		verifyChangeEmailRequestLoading
	};
};
