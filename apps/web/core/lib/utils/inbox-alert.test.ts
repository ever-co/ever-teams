import type { RealtimeEnvelope } from '@/core/lib/realtime/events';
import {
	INBOX_ALERT_FRESH_MS,
	INBOX_SOUND_STORAGE_KEY,
	inboxAlertKeyOf,
	readInboxSound,
	scheduleChime,
	shouldChime,
	writeInboxSound,
	type ChimeContext
} from './inbox-alert';

const NOW = Date.parse('2026-11-11T10:00:00.000Z');

function envelope(overrides: Partial<RealtimeEnvelope> = {}): RealtimeEnvelope {
	return {
		eventId: 'event-1',
		eventName: 'inbox_item.created',
		occurredAt: new Date(NOW - 1_000).toISOString(),
		aggregate: { type: 'InboxItem', id: 'item-1' },
		sequence: 1,
		data: { id: 'item-1', kind: 'notice', recipientUserIds: ['user-1'] },
		...overrides
	};
}

describe('inboxAlertKeyOf', () => {
	it('keys a new entry delivered to this person by the entry, as the push worker tags it', () => {
		expect(inboxAlertKeyOf(envelope(), { userId: 'user-1', now: NOW })).toBe('inbox-item-1');
	});

	it('reads the entry from the aggregate when the payload does not name it, and trusts an event without recipients', () => {
		expect(inboxAlertKeyOf(envelope({ data: null }), { userId: 'user-1', now: NOW })).toBe('inbox-item-1');
		expect(inboxAlertKeyOf(envelope({ data: { id: 'item-2' } }), { userId: null, now: NOW })).toBe('inbox-item-2');
	});

	it('ignores other events, entries for someone else and entries without an id', () => {
		expect(
			inboxAlertKeyOf(envelope({ eventName: 'inbox_item.state_changed' }), { userId: 'user-1', now: NOW })
		).toBeNull();
		expect(
			inboxAlertKeyOf(envelope({ eventName: 'employee_notification.created' }), { userId: 'user-1', now: NOW })
		).toBeNull();
		expect(inboxAlertKeyOf(envelope(), { userId: 'user-2', now: NOW })).toBeNull();
		expect(inboxAlertKeyOf(envelope(), { userId: null, now: NOW })).toBeNull();
		expect(
			inboxAlertKeyOf(envelope({ data: {}, aggregate: { type: 'InboxItem', id: '' } }), {
				userId: 'user-1',
				now: NOW
			})
		).toBeNull();
	});

	it('stays silent for a replay older than the fresh window, and for a time it cannot read', () => {
		const stale = new Date(NOW - INBOX_ALERT_FRESH_MS - 1).toISOString();
		const edge = new Date(NOW - INBOX_ALERT_FRESH_MS).toISOString();
		expect(inboxAlertKeyOf(envelope({ occurredAt: stale }), { userId: 'user-1', now: NOW })).toBeNull();
		expect(inboxAlertKeyOf(envelope({ occurredAt: edge }), { userId: 'user-1', now: NOW })).toBe('inbox-item-1');
		expect(inboxAlertKeyOf(envelope({ occurredAt: 'yesterday' }), { userId: 'user-1', now: NOW })).toBeNull();
	});
});

describe('shouldChime', () => {
	it('chimes in a visible tab, and in a hidden one only where the device shows no browser notification', () => {
		expect(shouldChime({ isVisible: true, hasPushSubscription: true })).toBe(true);
		expect(shouldChime({ isVisible: true, hasPushSubscription: false })).toBe(true);
		expect(shouldChime({ isVisible: false, hasPushSubscription: false })).toBe(true);
		expect(shouldChime({ isVisible: false, hasPushSubscription: true })).toBe(false);
	});
});

describe('the sound choice', () => {
	it('is off until switched on, is kept per browser, and survives a storage that refuses it', () => {
		const values = new Map<string, string>();
		const storage = {
			getItem: (key: string) => values.get(key) ?? null,
			setItem: (key: string, value: string) => void values.set(key, value),
			removeItem: (key: string) => void values.delete(key)
		};

		expect(readInboxSound(storage)).toBe(false);
		writeInboxSound(storage, true);
		expect(values.get(INBOX_SOUND_STORAGE_KEY)).toBe('on');
		expect(readInboxSound(storage)).toBe(true);
		writeInboxSound(storage, false);
		expect(values.has(INBOX_SOUND_STORAGE_KEY)).toBe(false);

		const refusing = {
			getItem: () => {
				throw new Error('SecurityError');
			},
			setItem: () => {
				throw new Error('SecurityError');
			},
			removeItem: () => undefined
		};
		expect(readInboxSound(refusing)).toBe(false);
		expect(() => writeInboxSound(refusing, true)).not.toThrow();
		expect(readInboxSound(null)).toBe(false);
	});
});

describe('scheduleChime', () => {
	it('schedules two short rising notes into the output, each stopped after its fade', () => {
		const started: Array<{ frequency: number; start: number; stop: number }> = [];
		const destination = {} as AudioDestinationNode;
		const connections: unknown[] = [];
		const param = () => ({ setValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn() });
		const context = {
			currentTime: 5,
			destination,
			createOscillator: () => {
				const note = { frequency: 0, start: 0, stop: 0 };
				return {
					type: 'square',
					frequency: { setValueAtTime: (value: number) => (note.frequency = value) },
					connect: (target: unknown) => connections.push(target),
					start: (at: number) => {
						note.start = at;
						started.push(note);
					},
					stop: (at: number) => (note.stop = at)
				};
			},
			createGain: () => ({ gain: param(), connect: (target: unknown) => connections.push(target) })
		} as unknown as ChimeContext;

		scheduleChime(context);

		expect(started.map((note) => note.frequency)).toEqual([880, 1318.51]);
		expect(started[0].start).toBe(5);
		expect(started[1].start).toBeGreaterThan(5);
		for (const note of started) expect(note.stop).toBeGreaterThan(note.start);
		expect(connections.filter((target) => target === destination)).toHaveLength(2);
	});
});
