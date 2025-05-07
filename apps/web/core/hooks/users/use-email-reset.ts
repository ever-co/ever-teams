import { emailResetService } from '@/core/services/client/api/users/emails/email-reset.service';
import { useQuery } from '../common/use-query';

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
