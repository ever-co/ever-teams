import { useRequestToJoinQuery } from './use-request-to-join-query';
import { useRequestToJoinMutation } from './use-request-to-join-mutation';
import { useValidateRequestToJoin } from './use-validate-request-to-join';
import { useResendCodeRequestToJoin } from './use-resend-code-request-to-join';
import { useAcceptRejectRequestToJoin } from './use-accept-reject-request-to-join';

/**
 * @deprecated This hook re-exports from specialized hooks for backward compatibility.
 * For new code, prefer using the specific hooks directly:
 * - `useRequestToJoinQuery` for read operations
 * - `useRequestToJoinMutation` for requesting to join a team
 * - `useValidateRequestToJoin` for validating a join request
 * - `useResendCodeRequestToJoin` for resending the join code
 * - `useAcceptRejectRequestToJoin` for accepting/rejecting requests
 * - `useInvalidateRequestToJoin` for shared cache invalidation
 */
export const useRequestToJoinTeam = () => {
	const queryData = useRequestToJoinQuery();
	const requestData = useRequestToJoinMutation();
	const validateData = useValidateRequestToJoin();
	const resendData = useResendCodeRequestToJoin();
	const acceptRejectData = useAcceptRejectRequestToJoin();

	return {
		// Backward compatible interface - exact same as before
		requestToJoinLoading: requestData.requestToJoinLoading,
		requestToJoinQueryCall: requestData.requestToJoinQueryCall,
		validateRequestToJoinLoading: validateData.validateRequestToJoinLoading,
		validateRequestToJoinQueryCall: validateData.validateRequestToJoinQueryCall,
		resendCodeRequestToJoinLoading: resendData.resendCodeRequestToJoinLoading,
		resendCodeRequestToJoinQueryCall: resendData.resendCodeRequestToJoinQueryCall,
		requestToJoinTeam: requestData.requestToJoinTeam,
		validateRequestToJoinTeam: validateData.validateRequestToJoinTeam,
		resendCodeRequestToJoinTeam: resendData.resendCodeRequestToJoinTeam,
		getRequestToJoin: queryData.getRequestToJoin,
		getRequestToJoinLoading: queryData.getRequestToJoinLoading,
		requestToJoin: queryData.requestToJoin,
		acceptRejectRequestToJoin: acceptRejectData.acceptRejectRequestToJoin,
		acceptRejectRequestToJoinLoading: acceptRejectData.acceptRejectRequestToJoinLoading,

		// Additional React Query states for advanced usage
		requestToJoinQuery: queryData.requestToJoinQuery,
		requestToJoinMutation: requestData.requestToJoinMutation,
		validateRequestToJoinMutation: validateData.validateRequestToJoinMutation,
		resendCodeMutation: resendData.resendCodeMutation,
		acceptRejectMutation: acceptRejectData.acceptRejectMutation
	};
};
