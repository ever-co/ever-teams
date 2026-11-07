import { RealtimeEnvelope } from './events';
import { invalidationsFor, resyncInvalidations } from './invalidation';

const scope = { tenantId: 'ten', organizationId: 'org', employeeId: 'emp', userId: 'usr' };

function event(eventName: string, data: Record<string, unknown> | null): RealtimeEnvelope {
	return { eventId: 'e', eventName, occurredAt: '2026-01-01T00:00:00.000Z', aggregate: { type: 'x', id: 'y' }, sequence: null, data };
}

describe('invalidationsFor', () => {
	it('refetches the task and the task lists on a task hint, deferrable while editing', () => {
		const keys = invalidationsFor(event('task.updated', { entity: 'Task', entityId: 't1', action: 'updated' }), scope);
		expect(keys).toEqual([
			{ queryKey: ['tasks', 't1'], deferrable: true },
			{ queryKey: ['tasks'], deferrable: true }
		]);
	});

	it("refetches a task's comments on a comment hint", () => {
		const keys = invalidationsFor(
			event('comment.created', { entity: 'Comment', entityId: 'c1', action: 'created', parent: { entity: 'Task', entityId: 't1' } }),
			scope
		);
		expect(keys).toEqual([{ queryKey: ['task-comments', 'by-task', 'ten', 'org', 't1'], deferrable: true }]);
	});

	it('refetches the badge and the inbox on a mention or a notification, never deferred', () => {
		for (const name of ['mention.created', 'employee_notification.created', 'inbox_item.created']) {
			const keys = invalidationsFor(event(name, { entity: 'Comment', entityId: 'c1', action: 'created' }), scope);
			expect(keys.map((k) => k.queryKey)).toEqual([
				['notifications', 'unread-count'],
				['notifications', 'inbox'],
				['inbox']
			]);
			expect(keys.every((k) => !k.deferrable)).toBe(true);
		}
	});

	it('refetches the teams on presence, and nothing on a typing signal', () => {
		expect(invalidationsFor(event('presence.changed', { employeeId: 'e', status: 'active' }), scope)).toEqual([
			{ queryKey: ['organization-teams'], deferrable: false }
		]);
		expect(invalidationsFor(event('typing.signalled', { conversationId: 'c' }), scope)).toEqual([]);
	});

	it('refetches the pages and the linked file lists on a document hint', () => {
		expect(invalidationsFor(event('document.updated', { entity: 'Document', entityId: 'd1', action: 'updated' }), scope).map((k) => k.queryKey)).toEqual([
			['documents'],
			['entity-files']
		]);
	});

	it('refetches only the chat queries an event changed, everything of chat without its conversation', () => {
		const keysOf = (name: string, data: Record<string, unknown> | null) => invalidationsFor(event(name, data), scope).map((k) => k.queryKey);
		expect(keysOf('chat_message.created', { conversationId: 'c1', messageId: 'm2', threadRootId: 'm1' })).toEqual([
			['chat', 'messages', 'ten', 'c1'],
			['chat', 'thread', 'ten', 'm1'],
			['chat', 'thread', 'ten', 'm2'],
			['chat', 'conversations'],
			['chat', 'states'],
			['chat', 'threads']
		]);
		expect(keysOf('chat_thread.changed', { conversationId: 'c1', rootMessageId: 'm1', replyCount: 3 })).toEqual([
			['chat', 'thread', 'ten', 'm1'],
			['chat', 'messages', 'ten', 'c1'],
			['chat', 'threads'],
			['chat', 'conversations'],
			['chat', 'states']
		]);
		expect(keysOf('chat_member_state.changed', { conversationId: 'c1' })).toEqual([
			['chat', 'conversations'],
			['chat', 'states'],
			['chat', 'conversation', 'ten', 'c1'],
			['chat', 'browse'],
			['chat', 'members', 'ten', 'c1']
		]);
		expect(keysOf('chat_conversation.changed', null)).toEqual([['chat']]);
	});

	it('names every family on a resynchronisation', () => {
		const keys = resyncInvalidations(scope).map((k) => k.queryKey[0]);
		expect(keys).toEqual(expect.arrayContaining(['tasks', 'task-comments', 'notifications', 'organization-teams', 'documents', 'entity-files', 'chat', 'inbox']));
	});
});
