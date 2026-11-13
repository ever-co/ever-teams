'use client';

import { useMemo } from 'react';
import { detectTimeZone, listTimeZones, matchTimeZone } from '@/core/lib/utils/settings-time-zone';
import { useUserQuery } from '../queries/user-user.query';

/** The time zone a meeting is planned in at first: the one the person set in their preferences, else the browser's. */
export function useDefaultMeetingZone(): string {
	const { data: user } = useUserQuery();
	const storedZone = user?.timeZone;
	return useMemo(() => matchTimeZone(storedZone, listTimeZones()) ?? detectTimeZone(), [storedZone]);
}
