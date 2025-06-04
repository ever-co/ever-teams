import { emailResetService } from '@/core/services/client/api/users/emails/email-reset.service';
import { useQueryCall } from '../common/use-query';

export const useEmailReset = () => {
	const { queryCall: emailResetRequestQueryCall, loading: emailResetRequestLoading } = useQueryCall(
		emailResetService.resetEmail
	);

	const { queryCall: verifyChangeEmailRequestQueryCall, loading: verifyChangeEmailRequestLoading } = useQueryCall(
		emailResetService.verifyChangeEmail
	);

	return {
		emailResetRequestQueryCall,
		emailResetRequestLoading,
		verifyChangeEmailRequestQueryCall,
		verifyChangeEmailRequestLoading
	};
};
