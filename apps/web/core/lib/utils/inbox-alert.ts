import { REALTIME_EVENT_NAMES, occurredAtMs, type RealtimeEnvelope } from '@/core/lib/realtime/events';
import type { KeyValueStorage } from './docs-recent';

/**
 * The sound a new inbox entry makes in the app (realtime-client FR-8, inbox FR-6): a short chime, played by one
 * open tab of the browser, when the person switched it on for this browser.
 */

/** An event older than this is a replay (a tab catching up after sleep): it was new when it happened, not now. */
export const INBOX_ALERT_FRESH_MS = 2 * 60_000;

/** How long a hidden tab yields before claiming an entry, so the tab the person is looking at plays the sound. */
export const INBOX_ALERT_HIDDEN_YIELD_MS = 400;

/** The browser's choice: `on`, or anything else for off (the default). */
export const INBOX_SOUND_STORAGE_KEY = 'ever-teams.inbox.sound';

function stringOf(value: unknown): string | null {
	return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * The claim key of a new inbox entry the person should hear about, or null: only `inbox_item.created`, for an item
 * delivered to this user, that happened in the last {@link INBOX_ALERT_FRESH_MS}. The key names the entry, as the
 * push worker's notification tag does, so two events about one entry sound once.
 */
export function inboxAlertKeyOf(
	envelope: RealtimeEnvelope,
	scope: { userId: string | null; now: number }
): string | null {
	if (envelope.eventName !== REALTIME_EVENT_NAMES.INBOX_ITEM_CREATED) return null;
	const data = (envelope.data ?? {}) as { id?: unknown; recipientUserIds?: unknown };
	const itemId = stringOf(data.id) ?? stringOf(envelope.aggregate?.id);
	if (!itemId) return null;
	// The platform streams the event to the recipients only; an event that names others is not this person's.
	if (Array.isArray(data.recipientUserIds) && data.recipientUserIds.length > 0) {
		if (!scope.userId || !data.recipientUserIds.includes(scope.userId)) return null;
	}
	const at = occurredAtMs(envelope);
	if (at === null || scope.now - at > INBOX_ALERT_FRESH_MS) return null;
	return `inbox-${itemId}`;
}

/**
 * Whether a tab plays the sound for an entry it claimed. A visible tab does. A hidden one does only when this browser
 * gets no browser notifications: where it does, the notification the device shows is the alert, and a chime on top
 * would sound it twice.
 */
export function shouldChime(tab: { isVisible: boolean; hasPushSubscription: boolean }): boolean {
	return tab.isVisible || !tab.hasPushSubscription;
}

export function readInboxSound(storage: KeyValueStorage | null): boolean {
	try {
		return storage?.getItem(INBOX_SOUND_STORAGE_KEY) === 'on';
	} catch {
		return false;
	}
}

export function writeInboxSound(storage: KeyValueStorage | null, isOn: boolean): void {
	try {
		storage?.setItem(INBOX_SOUND_STORAGE_KEY, isOn ? 'on' : 'off');
	} catch {
		// Storage refused: the choice lasts as long as the page.
	}
}

/** The parts of an `AudioContext` the chime uses. */
export type ChimeContext = Pick<BaseAudioContext, 'createOscillator' | 'createGain' | 'currentTime' | 'destination'>;

/** Two soft rising notes (A5, E6), each with a short attack and a quick fade. */
const CHIME_NOTES: ReadonlyArray<{ frequency: number; offset: number }> = [
	{ frequency: 880, offset: 0 },
	{ frequency: 1318.51, offset: 0.12 }
];

const CHIME_PEAK_GAIN = 0.12;
const CHIME_NOTE_SECONDS = 0.28;

/** Schedules the chime on a context, starting now. Nothing is loaded: the notes are synthesised. */
export function scheduleChime(context: ChimeContext): void {
	const start = context.currentTime;
	for (const note of CHIME_NOTES) {
		const at = start + note.offset;
		const oscillator = context.createOscillator();
		const gain = context.createGain();
		oscillator.type = 'sine';
		oscillator.frequency.setValueAtTime(note.frequency, at);
		gain.gain.setValueAtTime(0.0001, at);
		gain.gain.exponentialRampToValueAtTime(CHIME_PEAK_GAIN, at + 0.015);
		gain.gain.exponentialRampToValueAtTime(0.0001, at + CHIME_NOTE_SECONDS);
		oscillator.connect(gain);
		gain.connect(context.destination);
		oscillator.start(at);
		oscillator.stop(at + CHIME_NOTE_SECONDS + 0.02);
	}
}
