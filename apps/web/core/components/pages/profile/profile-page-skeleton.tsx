'use client';

import { FC } from 'react';
import { useAtomValue } from 'jotai';
import { useParams } from 'next/navigation';
import { PageSkeletonFrame } from '@/core/components/layouts/page-skeleton';
import { UserProfileTaskSkeleton } from '@/core/components/common/skeleton/profile-component-skeletons';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { isTrackingEnabledState } from '@/core/stores';
import { ProfileBandSkeleton, ProfileTabsSkeleton } from './profile-band-skeleton';

interface ProfilePageSkeletonProps {
	className?: string;
	/** Whether the profile shows the timer; unknown before the user loads, when it is assumed to be the user's own. */
	showTimer?: boolean;
}

function useShowsOwnTimer(showTimer: boolean | undefined) {
	const params = useParams<{ memberId?: string }>();
	const { data: user } = useUserQuery();
	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);
	if (showTimer !== undefined) {
		return showTimer;
	}
	const isUserKnown = Boolean(user);
	const isOtherMember = isUserKnown && user?.id !== params?.memberId;
	const showsTimer = isTrackingEnabled && !isOtherMember;
	return showsTimer;
}

/** The profile head while it loads: the identity band, then the tab row. */
function ProfileToolbarSkeleton({ showsTimer }: Readonly<{ showsTimer: boolean }>) {
	return (
		<div className="px-4">
			<ProfileBandSkeleton showsTimer={showsTimer} />
			<ProfileTabsSkeleton />
		</div>
	);
}

/** The profile page while the route, the user or the member loads, on the loaded page's frame and blocks. */
export const ProfilePageSkeleton: FC<ProfilePageSkeletonProps> = ({ className, showTimer }) => {
	const showsTimer = useShowsOwnTimer(showTimer);
	return (
		<PageSkeletonFrame className={className} toolbar={<ProfileToolbarSkeleton showsTimer={showsTimer} />}>
			<div className="mb-10">
				<UserProfileTaskSkeleton />
			</div>
		</PageSkeletonFrame>
	);
};

export default ProfilePageSkeleton;
