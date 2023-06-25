import {
	IRequestToJoinActionEnum,
	IRequestToJoinCreate,
	IValidateRequestToJoin,
} from '@app/interfaces';
import {
	requestToJoinAPI,
	validateRequestToJoinAPI,
	resendCodeRequestToJoinAPI,
	getRequestToJoinAPI,
	acceptRejectRequestToJoinAPI,
} from '@app/services/client/api';
import { requestToJoinState } from '@app/stores';
import { useCallback } from 'react';
import { useRecoilState } from 'recoil';

import { useQuery } from '../useQuery';

export const useRequestToJoinTeam = () => {
	const [requestToJoin, setRequestToJoin] = useRecoilState(requestToJoinState);

	const { loading: requestToJoinLoading, queryCall: requestToJoinQueryCall } =
		useQuery(requestToJoinAPI);
	const {
		loading: validateRequestToJoinLoading,
		queryCall: validateRequestToJoinQueryCall,
	} = useQuery(validateRequestToJoinAPI);
	const {
		loading: resendCodeRequestToJoinLoading,
		queryCall: resendCodeRequestToJoinQueryCall,
	} = useQuery(resendCodeRequestToJoinAPI);

	const {
		loading: getRequestToJoinLoading,
		queryCall: getRequestToJoinQueryCall,
	} = useQuery(getRequestToJoinAPI);

	const {
		loading: acceptRejectRequestToJoinLoading,
		queryCall: acceptRejectRequestToJoinQueryCall,
	} = useQuery(acceptRejectRequestToJoinAPI);

	const getRequestToJoin = useCallback(() => {
		return getRequestToJoinQueryCall().then((res) => {
			setRequestToJoin(res.data.items);
		});
	}, []);

	const requestToJoinTeam = useCallback(
		(data: IRequestToJoinCreate) => {
			return requestToJoinQueryCall(data).then((res) => {
				return res.data;
			});
		},
		[requestToJoinQueryCall]
	);
	const validateRequestToJoinTeam = useCallback(
		(data: IValidateRequestToJoin) => {
			return validateRequestToJoinQueryCall(data).then((res) => {
				return res.data;
			});
		},
		[validateRequestToJoinQueryCall]
	);
	const resendCodeRequestToJoinTeam = useCallback(
		(data: IRequestToJoinCreate) => {
			return resendCodeRequestToJoinQueryCall(data).then((res) => {
				return res.data;
			});
		},
		[resendCodeRequestToJoinQueryCall]
	);

	const acceptRejectRequestToJoin = useCallback(
		(id: string, action: IRequestToJoinActionEnum) => {
			acceptRejectRequestToJoinQueryCall(id, action).then((res) => {
				getRequestToJoin();
			});
		},
		[acceptRejectRequestToJoinQueryCall]
	);

	return {
		requestToJoinLoading,
		requestToJoinQueryCall,
		validateRequestToJoinLoading,
		validateRequestToJoinQueryCall,
		resendCodeRequestToJoinLoading,
		resendCodeRequestToJoinQueryCall,
		requestToJoinTeam,
		validateRequestToJoinTeam,
		resendCodeRequestToJoinTeam,
		getRequestToJoin,
		getRequestToJoinLoading,
		requestToJoin,
		acceptRejectRequestToJoin,
		acceptRejectRequestToJoinLoading,
	};
};
