'use client';

import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useTimeZoneSetting } from '@/core/hooks/settings/use-time-zone-setting';
import { detectTimeZone } from '@/core/lib/utils/settings-time-zone';
import {
	DISMISSED_TIME_ZONE_PAIR_STORAGE_KEY,
	KEPT_TIME_ZONE_PAIR_STORAGE_KEY,
	readStoredPair,
	timeZoneNoticeOf,
	writeStoredPair
} from '@/core/lib/utils/time-zone-notice';

type StorageKind = 'localStorage' | 'sessionStorage';

interface BrowserSide {
	zone: string | null;
	keptPair: string | null;
	dismissedPair: string | null;
}

/** On the server, and in the first client render, the browser is unknown: no notice, so both renders agree. */
const UNKNOWN_BROWSER: BrowserSide = { zone: null, keptPair: null, dismissedPair: null };

/**
 * What this browser says and remembers, read once per page load and shared by every page of it, so an answer given
 * on one page holds on the next. Read with `useSyncExternalStore`, never set from an effect.
 */
let browserSide: BrowserSide | null = null;
const listeners = new Set<() => void>();

/** Reading `window.localStorage` itself throws where site data is blocked. */
function storageOf(kind: StorageKind): Storage | null {
	try {
		return window[kind];
	} catch {
		return null;
	}
}

function readBrowserSide(): BrowserSide {
	if (browserSide) {
		return browserSide;
	}
	browserSide = {
		zone: detectTimeZone(),
		keptPair: readStoredPair(storageOf('localStorage'), KEPT_TIME_ZONE_PAIR_STORAGE_KEY),
		dismissedPair: readStoredPair(storageOf('sessionStorage'), DISMISSED_TIME_ZONE_PAIR_STORAGE_KEY)
	};
	return browserSide;
}

function serverBrowserSide(): BrowserSide {
	return UNKNOWN_BROWSER;
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

function remember(change: Partial<BrowserSide>) {
	browserSide = { ...readBrowserSide(), ...change };
	for (const listener of listeners) {
		listener();
	}
}

/** The notice that offers the browser's time zone when it differs from the profile's, with its three answers. */
export function useTimeZoneNotice() {
	const { data: user } = useUserQuery();
	const { saveZone, isSaving } = useTimeZoneSetting();
	const browser = useSyncExternalStore(subscribe, readBrowserSide, serverBrowserSide);
	const [adoptedPair, setAdoptedPair] = useState<string | null>(null);
	const [hasFailed, setHasFailed] = useState(false);
	const profileValue = user?.timeZone ?? null;
	const hasUser = Boolean(user);

	const notice = useMemo(() => {
		if (!hasUser) {
			return null;
		}
		const found = timeZoneNoticeOf({
			profileValue,
			browserZone: browser.zone,
			keptPair: browser.keptPair,
			dismissedPair: browser.dismissedPair,
			now: new Date()
		});
		// Saved: the profile reads the old zone until the user query refreshes, which must not bring the notice back
		const isAdopted = found !== null && found.pairKey === adoptedPair;
		if (isAdopted) {
			return null;
		}
		return found;
	}, [adoptedPair, browser, hasUser, profileValue]);

	const adoptBrowserZone = useCallback(async () => {
		if (!notice) {
			return;
		}
		setHasFailed(false);
		const isSaved = await saveZone(notice.browserZone);
		if (!isSaved) {
			setHasFailed(true);
			return;
		}
		setAdoptedPair(notice.pairKey);
	}, [notice, saveZone]);

	const keepProfileZone = useCallback(() => {
		if (!notice) {
			return;
		}
		writeStoredPair(storageOf('localStorage'), KEPT_TIME_ZONE_PAIR_STORAGE_KEY, notice.pairKey);
		remember({ keptPair: notice.pairKey });
	}, [notice]);

	const dismiss = useCallback(() => {
		if (!notice) {
			return;
		}
		writeStoredPair(storageOf('sessionStorage'), DISMISSED_TIME_ZONE_PAIR_STORAGE_KEY, notice.pairKey);
		remember({ dismissedPair: notice.pairKey });
	}, [notice]);

	return { notice, isSaving, hasFailed, adoptBrowserZone, keepProfileZone, dismiss };
}
