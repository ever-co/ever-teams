import { useOrganizationTeams } from '@app/hooks';
import { useQuery } from '@app/hooks/useQuery';
import { getAuthenticatedUserDataAPI } from '@app/services/client/api';
import { userState } from '@app/stores';
// import { BackdropLoader } from 'lib/components';
import { CreateTeamModal } from 'lib/features';
import { JoinTeamModal } from 'lib/features/team/join-team-modal';
// import { useTranslation } from 'lib/i18n';
import { GetServerSidePropsContext, NextPage, PreviewData } from 'next';
import { ParsedUrlQuery } from 'querystring';
import { useCallback, useEffect, useState } from 'react';
import { useRecoilState } from 'recoil';
import TeamPageSkeleton from '@components/shared/skeleton/TeamPageSkeleton';
import {
	getNoTeamPopupShowCookie,
	setNoTeamPopupShowCookie,
} from '@app/helpers';

export function withAuthentication(
	Component: NextPage<any, any>,
	{ displayName }: { displayName: string; pageTitle?: string }
) {
	const AppComponent = (props: any) => {
		// const { trans } = useTranslation();
		const [user, setUser] = useRecoilState(userState);
		const { queryCall, loading } = useQuery(getAuthenticatedUserDataAPI);
		const noTeamPopupShow = getNoTeamPopupShowCookie();

		const { isTeamMember } = useOrganizationTeams();
		const [showCreateTeamModal, setShowCreateTeamModal] =
			useState<boolean>(false);
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
					setUser(res.data.user);
				});
			}
		}, [queryCall, setUser, user]);

		return (
			<>
				{!user || loading ? (
					<TeamPageSkeleton />
				) : (
					<>
						<Component {...props} />
						{/* <BackdropLoader
							canCreatePortal={false}
							title={trans.common.LOADING}
							fadeIn={false}
							show={loading}
						/> */}
						{user && !isTeamMember && showCreateTeamModal && (
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
						{user && !isTeamMember && showJoinTeamModal && (
							<JoinTeamModal
								open={showJoinTeamModal}
								closeModal={() => {
									closeModalIfNewTeamCreated();
								}}
							/>
						)}
					</>
				)}
			</>
		);
	};

	AppComponent.displayName = displayName;

	return AppComponent;
}

export function getAuthenticationProps(
	context: GetServerSidePropsContext<ParsedUrlQuery, PreviewData>
) {
	let user = null;
	try {
		user = JSON.parse(context.res.getHeader('x-user') as string);
	} catch (_) {
		//
	}
	return { user };
}
