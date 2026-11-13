/**
 * The rules of the Integrations dialog (a channel's incoming webhooks), without a component: who may manage them, what
 * the platform's answer to the list means, the form of a webhook, and why a write failed (403, the limit of 10, a
 * refused value, a webhook gone).
 */
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { EChatConversationKind, EChatMemberRole, IChatWebhook } from '@/core/types/interfaces/common/chat';
import {
	canOpenWebhooks,
	EMPTY_WEBHOOK_FORM,
	isWebhookLimitReached,
	mayManageChatWebhooks,
	webhookChanges,
	webhookCreateInputOf,
	webhookFailureOf,
	webhookFormOf,
	webhooksAvailabilityOf,
	withWebhook
} from './chat-webhooks';

function webhook(id: string, extra: Partial<IChatWebhook> = {}): IChatWebhook {
	return {
		id,
		conversationId: 'c1',
		name: `Hook ${id}`,
		iconUrl: null,
		interactionUrl: null,
		tokenHint: 'ab12',
		hasSigningSecret: true,
		canBroadcast: false,
		createdByEmployeeId: 'e1',
		createdAt: '2026-11-12T10:00:00.000Z',
		revokedAt: null,
		lastUsedAt: null,
		acceptedCount: 0,
		rejectedCount: 0,
		rateLimitedCount: 0,
		callbackFailureCount: 0,
		...extra
	};
}

const channel = (extra: Partial<Parameters<typeof mayManageChatWebhooks>[0]> = {}) => ({
	kind: EChatConversationKind.Channel,
	state: null,
	createdByEmployeeId: 'creator',
	...extra
});

const refusal = (status: number, message: string | string[] = 'Refused') =>
	new ApiErrorService(message as string, status);

describe('chat webhooks', () => {
	describe('mayManageChatWebhooks', () => {
		it('lets chat managers, the channel managers and its creator in, on a channel only', () => {
			expect(mayManageChatWebhooks(channel(), 'someone', true)).toBe(true);
			expect(
				mayManageChatWebhooks(channel({ state: { role: EChatMemberRole.Manager } as never }), 'someone', false)
			).toBe(true);
			expect(mayManageChatWebhooks(channel(), 'creator', false)).toBe(true);
			expect(
				mayManageChatWebhooks(channel({ state: { role: EChatMemberRole.Member } as never }), 'someone', false)
			).toBe(false);
			expect(mayManageChatWebhooks(channel(), null, false)).toBe(false);
			expect(mayManageChatWebhooks(channel({ kind: EChatConversationKind.Direct }), 'creator', true)).toBe(false);
			expect(mayManageChatWebhooks(channel({ kind: EChatConversationKind.Group }), 'creator', true)).toBe(false);
		});
	});

	describe('webhooksAvailabilityOf', () => {
		it('reads 404 as webhooks off and 403 as not mine to manage: the entry hides for both', () => {
			const off = webhooksAvailabilityOf({
				isSuccess: false,
				isError: true,
				error: refusal(404, 'Cannot GET /api/chat/conversations/c1/webhooks')
			});
			const forbidden = webhooksAvailabilityOf({ isSuccess: false, isError: true, error: refusal(403) });
			expect([off, forbidden]).toEqual(['off', 'forbidden']);
			expect(canOpenWebhooks(off)).toBe(false);
			expect(canOpenWebhooks(forbidden)).toBe(false);
		});

		it('keeps the entry for a list, and for a failure a retry may fix', () => {
			const listed = webhooksAvailabilityOf({ isSuccess: true, isError: false, error: null });
			const failed = webhooksAvailabilityOf({ isSuccess: false, isError: true, error: refusal(502) });
			const unknown = webhooksAvailabilityOf({ isSuccess: false, isError: false, error: null });
			expect([listed, failed, unknown]).toEqual(['available', 'failed', 'unknown']);
			expect(canOpenWebhooks(listed)).toBe(true);
			expect(canOpenWebhooks(failed)).toBe(true);
			expect(canOpenWebhooks(unknown)).toBe(false);
		});
	});

	describe('the form', () => {
		it('sends a new webhook trimmed, with no URL for an empty field', () => {
			expect(
				webhookCreateInputOf({
					name: '  Alerts ',
					iconUrl: ' ',
					interactionUrl: ' https://hooks.example.com/click ',
					canBroadcast: true
				})
			).toEqual({
				name: 'Alerts',
				iconUrl: null,
				interactionUrl: 'https://hooks.example.com/click',
				canBroadcast: true
			});
			expect(webhookCreateInputOf(EMPTY_WEBHOOK_FORM)).toEqual({
				name: '',
				iconUrl: null,
				interactionUrl: null,
				canBroadcast: false
			});
		});

		it('changes only what differs, and clears an emptied URL with null', () => {
			const existing = webhook('w1', {
				name: 'Alerts',
				iconUrl: 'https://cdn.example.com/a.png',
				interactionUrl: 'https://hooks.example.com/click'
			});
			const form = webhookFormOf(existing);
			expect(webhookChanges(existing, form)).toEqual({});
			expect(webhookChanges(existing, { ...form, name: ' Ops alerts ', iconUrl: '' })).toEqual({
				name: 'Ops alerts',
				iconUrl: null
			});
			expect(webhookChanges(existing, { ...form, interactionUrl: '', canBroadcast: true })).toEqual({
				interactionUrl: null,
				canBroadcast: true
			});
			// A name cleared is no change: the platform needs one.
			expect(webhookChanges(existing, { ...form, name: '  ' })).toEqual({});
		});
	});

	describe('the list', () => {
		it('counts the webhooks that are not revoked against the limit of 10', () => {
			const nine = Array.from({ length: 9 }, (_, index) => webhook(`w${index}`));
			expect(isWebhookLimitReached(nine)).toBe(false);
			expect(
				isWebhookLimitReached([...nine, webhook('revoked', { revokedAt: '2026-11-12T11:00:00.000Z' })])
			).toBe(false);
			expect(isWebhookLimitReached([...nine, webhook('w9')])).toBe(true);
		});

		it('puts a new webhook first and a changed one in its place', () => {
			const list = [webhook('w2'), webhook('w1')];
			expect(withWebhook(list, webhook('w3')).map((item) => item.id)).toEqual(['w3', 'w2', 'w1']);
			const revoked = withWebhook(list, webhook('w1', { revokedAt: '2026-11-12T11:00:00.000Z' }));
			expect(revoked.map((item) => item.id)).toEqual(['w2', 'w1']);
			expect(revoked[1].revokedAt).toBe('2026-11-12T11:00:00.000Z');
		});
	});

	describe('webhookFailureOf', () => {
		it('says who may manage the webhooks on a 403', () => {
			expect(
				webhookFailureOf(refusal(403, 'Only a manager of this conversation can do that.'), 'create')
			).toEqual({ reason: 'FORBIDDEN', detail: null });
			expect(webhookFailureOf(refusal(403), 'revoke')).toEqual({ reason: 'FORBIDDEN', detail: null });
		});

		it('names the limit of 10 on a create refused with 409, or with the platform’s 400 that says so', () => {
			expect(webhookFailureOf(refusal(409), 'create')).toEqual({ reason: 'FULL', detail: null });
			expect(
				webhookFailureOf(refusal(400, 'A channel has at most 10 webhooks; revoke one first.'), 'create')
			).toEqual({ reason: 'FULL', detail: null });
		});

		it('shows the platform’s own reason for a refused value (422, 400)', () => {
			expect(
				webhookFailureOf(refusal(422, 'An interaction URL must be https on a public host.'), 'update')
			).toEqual({
				reason: 'INVALID',
				detail: 'An interaction URL must be https on a public host.'
			});
			expect(
				webhookFailureOf(refusal(400, ['name must be shorter than or equal to 80 characters']), 'create')
			).toEqual({
				reason: 'INVALID',
				detail: 'name must be shorter than or equal to 80 characters'
			});
			expect(webhookFailureOf(refusal(400, 'A revoked webhook cannot be changed.'), 'rotate')).toEqual({
				reason: 'INVALID',
				detail: 'A revoked webhook cannot be changed.'
			});
			// A 409 on another write is no limit.
			expect(webhookFailureOf(refusal(409, 'Conflict'), 'update').reason).toBe('INVALID');
		});

		it('reads a 404 as the webhook or its channel gone, and anything else as a failure', () => {
			expect(webhookFailureOf(refusal(404), 'revoke')).toEqual({ reason: 'GONE', detail: null });
			expect(webhookFailureOf(refusal(500, 'Internal server error'), 'create')).toEqual({
				reason: 'FAILED',
				detail: null
			});
			expect(webhookFailureOf(new Error('Network Error'), 'create')).toEqual({ reason: 'FAILED', detail: null });
		});
	});
});
