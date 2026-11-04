'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/core/lib/helpers';
import { LoadingStatusLine } from '@/core/components/common/skeleton/loading-status';

/** No `PageSkeletonFrame`: the room (Jitsi's frame, LiveKit's conference) fills the panel and draws its own interface. */
export function MeetRoomSkeleton({ label, className }: Readonly<{ label?: string; className?: string }>) {
	const t = useTranslations();
	const preparingLabel = t('collaborate.PREPARING_MEETING');
	const shownLabel = label ?? preparingLabel;
	return (
		<div
			role="status"
			aria-live="polite"
			aria-busy="true"
			className={cn('flex h-dvh w-full items-center justify-center p-4', className)}
		>
			<LoadingStatusLine label={shownLabel} />
		</div>
	);
}

export function JitsiMeetPageSkeleton() {
	return <MeetRoomSkeleton />;
}

export function LiveKitMeetPageSkeleton() {
	return <MeetRoomSkeleton className="bg-muted" />;
}
