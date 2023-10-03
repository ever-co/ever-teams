import {
	emailResetRequestAPI,
	verifyChangeEmailRequestAPI
} from '@app/services/client/api';

import { useQuery } from '../useQuery';

export const useEmailReset = () => {
	const {
		queryCall: emailResetRequestQueryCall,
		loading: emailResetRequestLoading
	} = useQuery(emailResetRequestAPI);

	const {
		queryCall: verifyChangeEmailRequestQueryCall,
		loading: verifyChangeEmailRequestLoading
	} = useQuery(verifyChangeEmailRequestAPI);

	return {
		emailResetRequestQueryCall,
		emailResetRequestLoading,
		verifyChangeEmailRequestQueryCall,
		verifyChangeEmailRequestLoading
	};
};
