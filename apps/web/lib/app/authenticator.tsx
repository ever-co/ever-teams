import { getNoTeamPopupShowCookie, setNoTeamPopupShowCookie } from '@app/helpers';
import { useOrganizationTeams } from '@app/hooks';
import { useQuery } from '@app/hooks/useQuery';
import { getAuthenticatedUserDataAPI } from '@app/services/client/api';
import { userState } from '@app/stores';
import TeamPageSkeleton from '@components/shared/skeleton/TeamPageSkeleton';
import { CreateTeamModal } from 'lib/features';
import { JoinTeamModal } from 'lib/features/team/join-team-modal';
import { GetServerSidePropsContext, NextPage, PreviewData } from 'next';
import { ParsedUrlQuery } from 'querystring';
import { useCallback, useEffect, useState } from 'react';
import { useRecoilState } from 'recoil';

type Params = {
	displayName: string;
	pageTitle?: string;
	showPageSkeleton?: boolean;
};

export function withAuthentication(Component: NextPage<any, any>, params: Params) {
	const { showPageSkeleton = true } = params;

	const AppComponent = (props: any) => {
		// const { trans } = useTranslation();
		const [user, setUser] = useRecoilState(userState);
		const { queryCall, loading } = useQuery(getAuthenticatedUserDataAPI);
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
				queryCall().then((res) => {
					setUser(res.data);
				});
			}
		}, [queryCall, setUser, user]);

		if (!user || loading) {
			return <></>;
		}
		if (showPageSkeleton) {
			return <TeamPageSkeleton />;
		}

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
