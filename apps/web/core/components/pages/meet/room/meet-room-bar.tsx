'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { Copy, PhoneOff, Users } from '@/core/components/icons';

/** "12:05", or "1:02:05" past an hour. */
export function elapsedLabelOf(milliseconds: number): string {
	const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	const twoDigits = (value: number) => String(value).padStart(2, '0');
	if (hours > 0) {
		return `${hours}:${twoDigits(minutes)}:${twoDigits(seconds)}`;
	}
	return `${twoDigits(minutes)}:${twoDigits(seconds)}`;
}

/** Ticks once a second on its own, so the room under the bar never re-renders for the clock. */
function ElapsedTime({ since }: Readonly<{ since: number }>) {
	const t = useTranslations();
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		const timer = window.setInterval(() => setNow(Date.now()), 1000);
		return () => window.clearInterval(timer);
	}, []);

	return (
		<time aria-label={t('meetings.ELAPSED')} className="tabular-nums text-muted-foreground">
			{elapsedLabelOf(now - since)}
		</time>
	);
}

/** What the bar can do in the room under it; given by the Jitsi or LiveKit room once it is up. */
export interface MeetRoomControls {
	leave: () => void;
	/** People in the room, the person included; null while the room does not say. */
	participantCount: number | null;
	/** When this person entered the room; null while connecting. */
	joinedAt: number | null;
}

interface MeetRoomBarProps extends MeetRoomControls {
	title: string | null;
	onCopyLink: () => void;
}

/** The band over a meeting room: what the meeting is, how long one has been in it, who is there, the link, leaving. */
export function MeetRoomBar({ title, joinedAt, participantCount, leave, onCopyLink }: Readonly<MeetRoomBarProps>) {
	const t = useTranslations();

	return (
		<header
			data-testid="meet-room-bar"
			className="flex min-h-12 shrink-0 flex-wrap items-center gap-x-3 gap-y-1 hairline-b border-border bg-card px-3 py-1.5 text-sm sm:px-4"
		>
			<span className="size-2 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
			<h1 className="min-w-0 flex-1 truncate font-medium text-foreground">{title ?? t('meetings.UNTITLED')}</h1>
			{joinedAt === null && <span className="text-muted-foreground">{t('meetings.CONNECTING')}</span>}
			{joinedAt !== null && <ElapsedTime since={joinedAt} />}
			{participantCount !== null && (
				<span className="flex items-center gap-1 text-muted-foreground">
					<Users className="size-4" aria-hidden="true" />
					{t('meetings.PARTICIPANTS', { count: participantCount })}
				</span>
			)}
			<div className="flex items-center gap-1.5">
				<Button type="button" variant="outline" size="sm" onClick={onCopyLink}>
					<Copy className="size-4" aria-hidden="true" />
					<span className="max-sm:sr-only">{t('meetings.COPY_LINK')}</span>
				</Button>
				<Button type="button" variant="destructive" size="sm" onClick={leave}>
					<PhoneOff className="size-4" aria-hidden="true" />
					{t('meetings.LEAVE')}
				</Button>
			</div>
		</header>
	);
}
