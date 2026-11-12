'use client';
/* eslint-disable no-mixed-spaces-and-tabs */
import { useLocalStorageState, useUserProfilePage } from '@/core/hooks';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { ArrowLeftIcon } from 'assets/svg';
import { PageLayout } from '@/core/components/layouts/default-layout';
import Link from 'next/link';
import React, { useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useProfileValidation } from '@/core/hooks/users/use-profile-validation';
import { ProfileErrorBoundary } from '@/core/components/common/profile-error-boundary';

import { useAtomValue, useSetAtom } from 'jotai';
import { activityTypeState } from '@/core/stores/timer/activity-type';
import { useTaskFilter } from '@/core/hooks/tasks/use-task-filter';
import { Breadcrumb } from '@/core/components/duplicated-components/breadcrumb';
import { ProfilePageSkeleton } from '@/core/components/common/skeleton/profile-page-skeleton';
import { ProfileTimer } from '@/core/components/pages/profile/profile-timer';
import { TrackingOffNotice } from '@/core/components/timer/tracking-off-notice';
import {
	LazyAppsTab,
	LazyScreenshootTab,
	LazyUserProfileTask,
	LazyUserProfileDetail,
	LazyVisitedSitesTab,
	LazyTaskFilter
} from '@/core/components/optimized-components';
import { activeTeamManagersState, activeTeamState, isOwnTrackingOffState, isTrackingEnabledState } from '@/core/stores';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import {
	normalizeProfileActivityTimeZone,
	useProfileActivity,
	useProfileActivityMonthRange
} from '@/core/hooks/activities/use-profile-activity';
import type {
	TProfileActivityResponse,
	TProfileActivityScope
} from '@/core/types/schemas/activities/profile-activity.schema';
import type { ProfileValidationResult } from '@/core/hooks/users/use-profile-validation';
import { personFullName } from '@/core/lib/utils/profile-figures';
import { useTeamDailyPlansOwner } from '@/core/hooks/bootstrap/use-feature-data';
import { useManagerRightsUnconfirmed } from '@/core/hooks/organizations/teams/use-manager-rights-unconfirmed';
import { Notice } from '@/core/components/common/notice';

export type FilterTab = 'Tasks' | 'Screenshots' | 'Apps' | 'Visited Sites';

const BACK_LINK_CLASS_NAME =
	'flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25';

/** The month summary only counts for the member it was read for: a response for the previous member is dropped. */
function summaryOfEmployee(summary: TProfileActivityResponse | undefined, employeeId: string | undefined | null) {
	if (!summary) {
		return undefined;
	}
	if (summary.employeeId !== employeeId) {
		return undefined;
	}
	return summary;
}

/** A member of the team whose account the team data does not carry cannot be shown: say so, never load forever. */
function unreadableMemberValidation(description: string, member: string, notFound: string): ProfileValidationResult {
	return {
		state: 'not-found',
		isValid: false,
		shouldShowError: true,
		shouldRedirect: false,
		errorMessage: `${member} ${notFound}`,
		errorDescription: description
	};
}

const Profile = React.memo(function ProfilePage({ params }: { params: { memberId: string } }) {
	useTeamDailyPlansOwner();
	const unwrappedParams = React.use(params as any) as { memberId: string };
	const { data: user } = useUserQuery();

	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);
	const isOwnTrackingOff = useAtomValue(isOwnTrackingOffState);

	// Use our new validation hook
	const profileValidation = useProfileValidation(unwrappedParams.memberId);

	// const { filteredTeams, userManagedTeams } = useOrganizationAndTeamManagers();
	const activeTeam = useAtomValue(activeTeamState);
	const profileUser = profileValidation.member?.employee?.user ?? null;

	const profile = useUserProfilePage();
	const activeTeamManagers = useAtomValue(activeTeamManagersState);

	const [activityFilter, setActivityFilter] = useLocalStorageState<FilterTab>('activity-filter', 'Tasks');
	const setActivityTypeFilter = useSetAtom(activityTypeState);

	const isManagerConnectedUser = useMemo(
		() => activeTeamManagers.findIndex((member) => member.employee?.user?.id === user?.id),
		[activeTeamManagers, user?.id]
	);
	const canSeeActivity = useMemo(
		() =>
			profile.userProfile?.id === user?.id ||
			isManagerConnectedUser !== -1 ||
			activeTeam?.shareProfileView === true,
		[activeTeam?.shareProfileView, isManagerConnectedUser, profile.userProfile?.id, user?.id]
	);
	const targetEmployeeId = useMemo(
		() =>
			profileValidation.isAuthUser
				? (user?.employee?.id ?? user?.employeeId)
				: (profileValidation.member?.employeeId ?? profileValidation.member?.employee?.id),
		[
			profileValidation.isAuthUser,
			profileValidation.member?.employeeId,
			profileValidation.member?.employee?.id,
			user?.employee?.id,
			user?.employeeId
		]
	);
	const activityTimeZone = useMemo(() => normalizeProfileActivityTimeZone(user?.timeZone), [user?.timeZone]);
	const activityScope = useMemo<TProfileActivityScope | null>(() => {
		if (
			!profileValidation.isValid ||
			!canSeeActivity ||
			!targetEmployeeId ||
			!activeTeam?.tenantId ||
			!activeTeam.organizationId
		) {
			return null;
		}

		return {
			tenantId: activeTeam.tenantId,
			organizationId: activeTeam.organizationId,
			organizationTeamId: activeTeam.id,
			employeeId: targetEmployeeId,
			timeZone: activityTimeZone
		};
	}, [
		activeTeam?.id,
		activeTeam?.organizationId,
		activeTeam?.tenantId,
		activityTimeZone,
		canSeeActivity,
		profileValidation.isValid,
		targetEmployeeId
	]);
	const currentMonthRange = useProfileActivityMonthRange(activityTimeZone);
	const summaryRequest = useMemo(
		() => (activityScope ? { ...activityScope, ...currentMonthRange, includeDaily: false } : null),
		[activityScope, currentMonthRange]
	);
	const profileActivitySummary = useProfileActivity(summaryRequest, {
		enabled: profileValidation.isValid && canSeeActivity
	});
	const summaryData = profileActivitySummary.data;
	const statsCount =
		summaryData && targetEmployeeId && summaryData.employeeId === targetEmployeeId ? summaryData.activeDays : 0;
	const hook = useTaskFilter(profile, { statsCount });
	const bandActivitySummary = summaryOfEmployee(summaryData, targetEmployeeId);
	const isActivitySummaryLoading = Boolean(profileActivitySummary.isLoading);

	const t = useTranslations();
	const memberName = personFullName(profile.userProfile);
	const breadcrumb = useMemo(
		() => [
			{ title: activeTeam?.name || '', href: '/' },
			{
				title: memberName,
				href: `/profile/${unwrappedParams.memberId}`
			}
		],
		[activeTeam?.name, memberName, unwrappedParams.memberId]
	);

	const activityScreens = useMemo(
		() => ({
			Tasks: (
				<LazyUserProfileTask
					profile={profile}
					tabFiltered={hook}
					user={profileUser}
					employeeId={profileValidation.member?.employeeId ?? undefined}
					activityScope={activityScope ?? undefined}
				/>
			),
			Screenshots: <LazyScreenshootTab />,
			Apps: <LazyAppsTab />,
			'Visited Sites': <LazyVisitedSitesTab />
		}),
		[activityScope, hook, profile, profileUser, profileValidation.member?.employeeId]
	);

	const activityScreen = activityScreens[activityFilter] ?? null;
	const profileIsAuthUser = useMemo(() => profile.isAuthUser, [profile.isAuthUser]);
	const managerRightsUnconfirmed = useManagerRightsUnconfirmed();

	const changeActivityFilter = useCallback(
		(filter: FilterTab) => {
			setActivityFilter(filter);
		},
		[setActivityFilter]
	);

	React.useEffect(() => {
		setActivityTypeFilter((prev) => ({
			...prev,
			member: profile.member ? profile.member : null
		}));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [profile.member]);

	// Handle error states with our new boundary component
	if (!profileValidation.isValid) {
		// Show loading skeleton for loading state
		if (profileValidation.state === 'loading') {
			return <ProfilePageSkeleton showTimer={profileIsAuthUser && isTrackingEnabled} />;
		}

		// Show error boundary for all other error states
		return (
			<ProfileErrorBoundary
				validation={profileValidation}
				loadTaskStatsIObserverRef={profile.loadTaskStatsIObserverRef}
			>
				<div>This will never render due to validation.isValid being false</div>
			</ProfileErrorBoundary>
		);
	}

	if (!profile.userProfile) {
		const notInTeamMessage = t('pages.profile.MEMBER_NOT_FOUND_MSG_2');
		const memberWord = t('common.MEMBER');
		const notFoundWord = t('common.NOT_FOUND');
		const unreadableMember = unreadableMemberValidation(notInTeamMessage, memberWord, notFoundWord);
		return (
			<ProfileErrorBoundary
				validation={unreadableMember}
				loadTaskStatsIObserverRef={profile.loadTaskStatsIObserverRef}
			>
				<div />
			</ProfileErrorBoundary>
		);
	}

	const isActivityViewVisible = hook.tab === 'worked' && canSeeActivity;
	// Only a teammate's profile reads member data the API may refuse; one's own profile always shows
	const showsManagerRightsNotice = managerRightsUnconfirmed && !profileIsAuthUser;
	const showsTimer = profileIsAuthUser && isTrackingEnabled;
	// A teammate's profile draws no timer of its own, so the viewer keeps the compact one in the top bar, or the reason
	// they have none: the layout gives the timer only to a member who can track
	const showsHeaderTimer = !profileIsAuthUser && (isTrackingEnabled || isOwnTrackingOff);
	let timerSlot: React.ReactNode = null;
	if (showsTimer) {
		timerSlot = <ProfileTimer />;
	} else if (profileIsAuthUser && isOwnTrackingOff) {
		timerSlot = <TrackingOffNotice />;
	}
	const activityView = {
		isVisible: isActivityViewVisible,
		value: activityFilter,
		onChange: changeActivityFilter,
		screen: activityScreen
	};

	return (
		<PageLayout
			showTimer={showsHeaderTimer}
			breadcrumb={
				<div className="flex gap-2 items-center min-w-0">
					<Link href="/" aria-label={t('profile.page.BACK_TO_TEAM')} className={BACK_LINK_CLASS_NAME}>
						<ArrowLeftIcon className="size-4" />
					</Link>
					<Breadcrumb paths={breadcrumb} className="min-w-0 text-sm" />
				</div>
			}
			mainHeaderSlot={
				<div className="px-4">
					<LazyUserProfileDetail
						member={profile.member}
						profile={profile}
						hook={hook}
						activitySummary={bandActivitySummary}
						isActivitySummaryLoading={isActivitySummaryLoading}
						canSeeActivity={canSeeActivity}
						timer={timerSlot}
					/>
					<LazyTaskFilter profile={profile} hook={hook} />
				</div>
			}
		>
			{showsManagerRightsNotice && (
				<Notice
					tone="warning"
					className="mx-4 mb-4"
					title={t('profile.page.MANAGER_RIGHTS_UNCONFIRMED_TITLE')}
					description={t('profile.page.MANAGER_RIGHTS_UNCONFIRMED_DESCRIPTION')}
				/>
			)}
			<div className="mb-10">
				<LazyUserProfileTask
					profile={profile}
					tabFiltered={hook}
					paginateTasks={true}
					user={profileUser}
					employeeId={profileValidation.member?.employeeId ?? undefined}
					activityScope={activityScope ?? undefined}
					activityView={activityView}
				/>
			</div>
		</PageLayout>
	);
});

export default withAuthentication(Profile, { displayName: 'ProfilePage', skeleton: ProfilePageSkeleton });
