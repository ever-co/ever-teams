import { hintOf, matchesAnyEventName, matchesEventName, occurredAtMs, RealtimeEnvelope } from './events';

describe('matchesEventName', () => {
	it('matches an exact name', () => {
		expect(matchesEventName('task.updated', 'task.updated')).toBe(true);
		expect(matchesEventName('task.updated', 'task.created')).toBe(false);
	});

	it('matches one segment with a family pattern, never more', () => {
		expect(matchesEventName('task.*', 'task.created')).toBe(true);
		expect(matchesEventName('task.*', 'task.comment.created')).toBe(false);
		expect(matchesEventName('task.*', 'tasks.created')).toBe(false);
		expect(matchesEventName('chat_message.*', 'chat_message.deleted')).toBe(true);
	});

	it('matches any entry of a selection', () => {
		expect(matchesAnyEventName(['task.*', 'mention.created'], 'mention.created')).toBe(true);
		expect(matchesAnyEventName(['task.*', 'mention.created'], 'presence.changed')).toBe(false);
	});
});

describe('hintOf / occurredAtMs', () => {
	const envelope: RealtimeEnvelope = {
		eventId: 'e1',
		eventName: 'task.updated',
		occurredAt: '2026-11-07T10:00:00.000Z',
		aggregate: { type: 'task', id: 't1' },
		sequence: 1,
		data: { entity: 'Task', entityId: 't1', action: 'updated' }
	};

	it('reads the change hint of a streamed event, and none from a signal', () => {
		expect(hintOf(envelope)?.entityId).toBe('t1');
		expect(hintOf({ ...envelope, data: { employeeId: 'e', status: 'active' } })).toBeNull();
		expect(hintOf({ ...envelope, data: null })).toBeNull();
	});

	it('reads the time, or null when it cannot be read', () => {
		expect(occurredAtMs(envelope)).toBe(Date.parse('2026-11-07T10:00:00.000Z'));
		expect(occurredAtMs({ occurredAt: 'not a date' })).toBeNull();
	});
});
