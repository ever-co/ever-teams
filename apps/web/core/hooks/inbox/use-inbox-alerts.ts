'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useRealtimeEvent } from '@/core/hooks/realtime/use-realtime-event';
import { REALTIME_EVENT_NAMES } from '@/core/lib/realtime/events';
import { claimForThisTab } from '@/core/lib/realtime/tab-claim';
import { localStorageOrNull } from '@/core/lib/utils/docs-recent';
import {
	INBOX_ALERT_HIDDEN_YIELD_MS,
	INBOX_SOUND_STORAGE_KEY,
	inboxAlertKeyOf,
	readInboxSound,
	scheduleChime,
	shouldChime,
	writeInboxSound
} from '@/core/lib/utils/inbox-alert';
import { isInboxEnabled } from '@/core/lib/utils/inbox-enabled';
import { thisBrowserPushSubscription } from '@/core/lib/utils/web-push';

const INBOX_ALERT_EVENTS: readonly string[] = [REALTIME_EVENT_NAMES.INBOX_ITEM_CREATED];

// The choice is the browser's: a switch in one tab reaches the others through the storage event.
const soundListeners = new Set<() => void>();

function subscribeToSound(listener: () => void): () => void {
	soundListeners.add(listener);
	const onStorage = (event: StorageEvent) => {
		if (event.key === null || event.key === INBOX_SOUND_STORAGE_KEY) listener();
	};
	window.addEventListener('storage', onStorage);
	return () => {
		soundListeners.delete(listener);
		window.removeEventListener('storage', onStorage);
	};
}

const soundSnapshot = () => readInboxSound(localStorageOrNull());
const serverSoundSnapshot = () => false;

let chimeContext: AudioContext | null = null;

/** The tab's one audio context, made on first use. */
function audioContext(): AudioContext | null {
	if (typeof window === 'undefined') return null;
	const Context =
		window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
	if (!Context) return null;
	try {
		chimeContext ??= new Context();
	} catch {
		return null;
	}
	return chimeContext;
}

async function playChime(): Promise<void> {
	const context = audioContext();
	if (!context) return;
	if (context.state === 'suspended') await context.resume().catch(() => undefined);
	if (context.state !== 'running') return;
	scheduleChime(context);
}

/**
 * Whether the page may start sound: a browser lets a page play only once the person has interacted with it. A tab
 * that may not does not claim the entry, so a tab that can play it does.
 */
function maySound(): boolean {
	const activation = typeof navigator === 'undefined' ? undefined : navigator.userActivation;
	return activation ? activation.hasBeenActive : true;
}

/** The sound for new entries in this browser, and the switch that sets it (a preview plays when it goes on). */
export function useInboxSound(): [boolean, (isOn: boolean) => void] {
	const isOn = useSyncExternalStore(subscribeToSound, soundSnapshot, serverSoundSnapshot);
	const setOn = useCallback((next: boolean) => {
		writeInboxSound(localStorageOrNull(), next);
		for (const listener of soundListeners) listener();
		// The switch is a click: the moment the browser lets the page start its audio.
		if (next) void playChime();
	}, []);
	return [isOn, setOn];
}

/** Plays the chime for one entry in the one tab that claims it. */
async function chimeOnce(key: string): Promise<void> {
	const isVisible = typeof document !== 'undefined' && document.visibilityState === 'visible';
	const hasPushSubscription = isVisible ? false : !!(await thisBrowserPushSubscription());
	if (!shouldChime({ isVisible, hasPushSubscription })) return;
	const claimed = await claimForThisTab(key, { yieldMs: isVisible ? 0 : INBOX_ALERT_HIDDEN_YIELD_MS });
	if (claimed) await playChime();
}

/**
 * The sound of a new inbox entry (realtime-client FR-8): every open tab receives `inbox_item.created` on its own
 * connection, and the one tab that claims the entry plays it — a visible tab before a hidden one. Off unless the
 * deployment has the Inbox and the person switched the sound on for this browser; with the live channel off, no
 * event arrives and nothing plays. Browser notifications are not shown here: the push worker shows them, one per
 * entry and device.
 */
export function useInboxAlerts(): void {
	const enabled = isInboxEnabled();
	const [isSoundOn] = useInboxSound();
	const { data: user } = useUserQuery();
	const userId = user?.id ?? null;

	useRealtimeEvent(INBOX_ALERT_EVENTS, (envelope) => {
		if (!enabled || !isSoundOn || !maySound()) return;
		const key = inboxAlertKeyOf(envelope, { userId, now: Date.now() });
		if (key) void chimeOnce(key);
	});
}
