'use client';
import { getNoTeamPopupShowCookie, setNoTeamPopupShowCookie } from '@/core/lib/helpers/index';
import { useOrganizationTeams } from '@/core/hooks';
import { useQueryCall } from '@/core/hooks/common/use-query';
import { userState } from '@/core/stores';
import { GetServerSidePropsContext, NextPage, PreviewData } from 'next';
import { ParsedUrlQuery } from 'querystring';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useAtom } from 'jotai';
import { userService } from '@/core/services/client/api';
import { BackdropLoader } from '@/core/components';
import GlobalSkeleton from '../../common/global-skeleton';
import { ModalSkeleton } from '../../common/skeleton/modal-skeleton';
import { LazyCreateTeamModal, LazyJoinTeamModal } from '../../optimized-components';

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

		const fetchUserData = useCallback(async () => {
			if (!user && !loading) {
				try {
					const data = await queryCall();
					setUser(data);
				} catch (error) {
					console.error('Failed to fetch user data:', error);
				}
			}
		}, [user, loading, queryCall, setUser]);

		useEffect(() => {
			fetchUserData();
		}, [fetchUserData]);

		// Show proper loading state instead of empty fragment
		if (!user || loading) {
			if (params.showPageSkeleton) {
				// For pages that support page skeleton, show BackdropLoader
				// This prevents blank pages and browser crashes during direct URL access
				return <BackdropLoader show={true} title="Loading..." />;
			}
			// For pages without page skeleton support, show BackdropLoader
			return <GlobalSkeleton />;
		}

		return (
			<div>
				<Component {...props} />
				{!isTeamMember && showCreateTeamModal && (
					<Suspense fallback={<ModalSkeleton />}>
						<LazyCreateTeamModal
							open={showCreateTeamModal}
							closeModal={() => {
								closeModalIfNewTeamCreated();
							}}
							joinTeamModal={() => {
								setShowCreateTeamModal(false);
								setShowJoinTeamModal(true);
							}}
						/>
					</Suspense>
				)}
				{!isTeamMember && showJoinTeamModal && (
					<Suspense fallback={<ModalSkeleton />}>
						<LazyJoinTeamModal
							open={showJoinTeamModal}
							closeModal={() => {
								closeModalIfNewTeamCreated();
							}}
						/>
					</Suspense>
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
