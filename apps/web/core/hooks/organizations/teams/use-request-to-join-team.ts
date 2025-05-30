import { requestToJoinState } from '@/core/stores';
import { useCallback } from 'react';
import { useAtom } from 'jotai';

import { requestToJoinTeamService } from '@/core/services/client/api/organizations/teams';
import { useQueryCall } from '../../common';
import { IJoinTeamRequest, IValidateRequestToJoinTeam } from '@/core/types/interfaces/team/request-to-join';
import { ERequestStatus } from '@/core/types/generics/enums';

export const useRequestToJoinTeam = () => {
	const [requestToJoin, setRequestToJoin] = useAtom(requestToJoinState);

	const { loading: requestToJoinLoading, queryCall: requestToJoinQueryCall } = useQueryCall(
		requestToJoinTeamService.requestToJoin
	);
	const { loading: validateRequestToJoinLoading, queryCall: validateRequestToJoinQueryCall } = useQueryCall(
		requestToJoinTeamService.validateRequestToJoin
	);
	const { loading: resendCodeRequestToJoinLoading, queryCall: resendCodeRequestToJoinQueryCall } = useQueryCall(
		requestToJoinTeamService.resendCodeRequestToJoin
	);

	const { loading: getRequestToJoinLoading, queryCall: getRequestToJoinQueryCall } = useQueryCall(
		requestToJoinTeamService.getRequestToJoin
	);

	const { loading: acceptRejectRequestToJoinLoading, queryCall: acceptRejectRequestToJoinQueryCall } = useQueryCall(
		requestToJoinTeamService.acceptRejectRequestToJoin
	);

	const getRequestToJoin = useCallback(() => {
		return getRequestToJoinQueryCall().then((res) => {
			setRequestToJoin(res.data.items);
		});
	}, [getRequestToJoinQueryCall, setRequestToJoin]);

	const requestToJoinTeam = useCallback(
		(data: IJoinTeamRequest) => {
			return requestToJoinQueryCall(data).then((res) => {
				return res.data;
			});
		},
		[requestToJoinQueryCall]
	);
	const validateRequestToJoinTeam = useCallback(
		(data: IValidateRequestToJoinTeam) => {
			return validateRequestToJoinQueryCall(data).then((res) => {
				return res.data;
			});
		},
		[validateRequestToJoinQueryCall]
	);
	const resendCodeRequestToJoinTeam = useCallback(
		(data: IJoinTeamRequest) => {
			return resendCodeRequestToJoinQueryCall(data).then((res) => {
				return res.data;
			});
		},
		[resendCodeRequestToJoinQueryCall]
	);

	const acceptRejectRequestToJoin = useCallback(
		(id: string, action: ERequestStatus) => {
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
