'use client';

import { useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { meetingTitleOf } from '@/core/lib/utils/meetings';
import type { MeetingJoinChoices } from './use-media-preview';

/** The steps of a meeting page: checking one's devices, in the room, then out of it. */
type MeetingStage = 'prejoin' | 'room' | 'left';

const MEETINGS_HOME = '/meet';

async function copyText(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		return false;
	}
}

/**
 * What the Jitsi and LiveKit pages share around their room: the pre-join step, the title the room shows, copying
 * its link, leaving and coming back in (a new attempt key remounts the room), and the way back to the meetings.
 */
export function useMeetingRoomFlow(roomName: string | null) {
	const t = useTranslations();
	const router = useRouter();
	const params = useSearchParams();
	const [stage, setStage] = useState<MeetingStage>('prejoin');
	const [choices, setChoices] = useState<MeetingJoinChoices | null>(null);
	const [attempt, setAttempt] = useState(0);
	const title = roomName ? meetingTitleOf(roomName, params.get('title')) : null;

	const join = useCallback((picked: MeetingJoinChoices) => {
		setChoices(picked);
		setStage('room');
	}, []);

	const leave = useCallback(() => setStage('left'), []);

	const rejoin = useCallback(() => {
		setAttempt((count) => count + 1);
		setStage('room');
	}, []);

	const backToMeetings = useCallback(() => router.push(MEETINGS_HOME), [router]);

	// The page's own address is the invitation: the room, its title, and the locale it was opened in
	const copyLink = useCallback(async () => {
		const link = window.location.href;
		const isCopied = await copyText(link);
		if (isCopied) {
			toast.success(t('meetings.LINK_COPIED'), { description: link });
			return;
		}
		toast.info(t('meetings.COPY_LINK'), { description: link, duration: 10000 });
	}, [t]);

	return { stage, choices, attempt, title, join, leave, rejoin, backToMeetings, copyLink };
}
