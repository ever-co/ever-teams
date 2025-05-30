import { getNoTeamPopupShowCookie, setNoTeamPopupShowCookie } from '@/core/lib/helpers/index';
import { useOrganizationTeams } from '@/core/hooks';
import { useQueryCall } from '@/core/hooks/common/use-query';
import { userState } from '@/core/stores';
import { GetServerSidePropsContext, NextPage, PreviewData } from 'next';
import { ParsedUrlQuery } from 'querystring';
import { useCallback, useEffect, useState } from 'react';
import { useAtom } from 'jotai';
import { userService } from '@/core/services/client/api';
import { JoinTeamModal } from '../../features/teams/join-team-modal';
import { CreateTeamModal } from '../../features/teams/create-team-modal';

type Params = {
	displayName: string;
	pageTitle?: string;
	showPageSkeleton?: boolean;
};

export function withAuthentication(Component: NextPage<any, any>, params: Params) {
	const AppComponent = (props: any) => {
		// const { trans } = useTranslation();
		const [user, setUser] = useAtom(userState);
		const { queryCall, loading } = useQueryCall(userService.getAuthenticatedUserData);
		const noTeamPopupShow = getNoTeamPopupShowCookie();

		const { isTeamMember } = useOrganizationTeams();
		const [showCreateTeamModal, setShowCreateTeamModal] = useState<boolean>(false);
		const [showJoinTeamModal, setShowJoinTeamModal] = useState<boolean>(false);

		useEffect(() => {
			if (noTeamPopupShow) {
				setShowCreateTeamModal(true);
			} else {
				setShowCreateTeamModal(false);
				setShowJoinTeamModal(false);
			}
		}, [isTeamMember, noTeamPopupShow]);
		const closeModalIfNewTeamCreated = useCallback(() => {
			setShowCreateTeamModal(false);
			setShowJoinTeamModal(false);
			setNoTeamPopupShowCookie(false);
		}, []);

		useEffect(() => {
			if (!user) {
				queryCall().then((res) => setUser(res.data));
			}
		}, [queryCall, setUser, user]);

		if (!user || loading) {
			return <></>;
		}
		// if (showPageSkeleton) {
		// 	return <TeamPageSkeleton />;
		// }

		return (
			<div>
				<Component {...props} />
				{!isTeamMember && showCreateTeamModal && (
					<CreateTeamModal
						open={showCreateTeamModal}
						closeModal={() => {
							closeModalIfNewTeamCreated();
						}}
						joinTeamModal={() => {
							setShowCreateTeamModal(false);
							setShowJoinTeamModal(true);
						}}
					/>
				)}
				{!isTeamMember && showJoinTeamModal && (
					<JoinTeamModal
						open={showJoinTeamModal}
						closeModal={() => {
							closeModalIfNewTeamCreated();
						}}
					/>
				)}
			</div>
		);
	};

	AppComponent.displayName = params.displayName;

	return AppComponent;
}

export function getAuthenticationProps(context: GetServerSidePropsContext<ParsedUrlQuery, PreviewData>) {
	let user = null;
	try {
		user = JSON.parse(context.res.getHeader('x-user') as string);
	} catch (_) {
		//
	}
	return { user };
}
