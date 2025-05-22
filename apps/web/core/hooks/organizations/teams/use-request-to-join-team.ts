import {
	IRequestToJoinActionEnum,
	IRequestToJoinCreate,
	IValidateRequestToJoin
} from '@/core/types/interfaces/to-review';
import { requestToJoinState } from '@/core/stores';
import { useCallback } from 'react';
import { useAtom } from 'jotai';

import { requestToJoinTeamService } from '@/core/services/client/api/organizations/teams';
import { useQuery } from '../../common';

export const useRequestToJoinTeam = () => {
	const [requestToJoin, setRequestToJoin] = useAtom(requestToJoinState);

	const { loading: requestToJoinLoading, queryCall: requestToJoinQueryCall } = useQuery(
		requestToJoinTeamService.requestToJoin
	);
	const { loading: validateRequestToJoinLoading, queryCall: validateRequestToJoinQueryCall } = useQuery(
		requestToJoinTeamService.validateRequestToJoin
	);
	const { loading: resendCodeRequestToJoinLoading, queryCall: resendCodeRequestToJoinQueryCall } = useQuery(
		requestToJoinTeamService.resendCodeRequestToJoin
	);

	const { loading: getRequestToJoinLoading, queryCall: getRequestToJoinQueryCall } = useQuery(
		requestToJoinTeamService.getRequestToJoin
	);

	const { loading: acceptRejectRequestToJoinLoading, queryCall: acceptRejectRequestToJoinQueryCall } = useQuery(
		requestToJoinTeamService.acceptRejectRequestToJoin
	);

	const getRequestToJoin = useCallback(() => {
		return getRequestToJoinQueryCall().then((res) => {
			setRequestToJoin(res.data.items);
		});
	}, [getRequestToJoinQueryCall, setRequestToJoin]);

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
			acceptRejectRequestToJoinQueryCall(id, action).then(() => {
				getRequestToJoin();
			});
		},
		[acceptRejectRequestToJoinQueryCall, getRequestToJoin]
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
		acceptRejectRequestToJoinLoading
	};
};
