import { emailResetService } from '@/core/services/client/api/email/email-reset.service';
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
