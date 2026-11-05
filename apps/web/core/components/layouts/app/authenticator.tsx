'use client';
import { getNoTeamPopupShowCookie, setNoTeamPopupShowCookie } from '@/core/lib/helpers/index';
import { isTeamMemberState, userState } from '@/core/stores';
import { GetServerSidePropsContext, NextPage, PreviewData } from 'next';
import { ParsedUrlQuery } from 'querystring';
import { type ComponentType, Suspense, useCallback, useEffect, useState } from 'react';
import { useAtom, useStore } from 'jotai';
import GlobalSkeleton from '../../common/global-skeleton';
import { ModalSkeleton } from '../../common/skeleton/modal-skeleton';
import { LazyCreateTeamModal, LazyJoinTeamModal } from '../../optimized-components';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { shouldReplaceStoredUser } from '@/core/lib/utils/stored-user';

type Params = {
	displayName: string;
	pageTitle?: string;
	/** No effect: the wait shows `skeleton` (or the generic one), never a full-screen loader. Kept for callers. */
	showPageSkeleton?: boolean;
	/**
	 * The page's own skeleton, the one its route `loading.tsx` shows, so the wait for the user is the same picture
	 * as the route loading before it and the page's first load after it.
	 */
	skeleton?: ComponentType;
};

/** Wraps a protected page with user loading, authentication state, and team-join/create modal handling. */
export function withAuthentication(Component: NextPage<any, any>, params: Params) {
	const AppComponent = (props: any) => {
		const [user, setUser] = useAtom(userState);
		const store = useStore();
		const noTeamPopupShow = getNoTeamPopupShowCookie();
		const isTeamMember = useAtom(isTeamMemberState);

		// PRIMARY DATA SOURCE, Use useUserQuery for reliable user data
		const userQuery = useUserQuery();

		// userState takes the query's user here only: a local save may store a newer user before the query reads it
		useEffect(() => {
			const queriedUser = userQuery.data;
			if (!queriedUser || !userQuery.isSuccess) {
				return;
			}
			const storedUser = store.get(userState);
			const replacesStoredUser = shouldReplaceStoredUser(storedUser, queriedUser);
			if (replacesStoredUser) {
				setUser(queriedUser);
			}
		}, [userQuery.data, userQuery.isSuccess, user, store, setUser]);

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

		// REMOVED: fetchUserData is now redundant since useEffect above handles sync

		const isUserPending = !userQuery.data || userQuery.isLoading;
		if (isUserPending) {
			const PageSkeleton = params.skeleton ?? GlobalSkeleton;
			return <PageSkeleton />;
		}

		return (
			<div className="h-full min-h-0">
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
