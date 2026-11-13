import { platformMessageOf } from '@/core/lib/utils/chat-errors';
import { errorStatusOf } from '@/core/lib/utils/error-feedback';
import {
	CHAT_WEBHOOK_MAX_PER_CONVERSATION,
	EChatConversationKind,
	EChatMemberRole
} from '@/core/types/interfaces/common/chat';
import type {
	IChatConversationWithState,
	IChatWebhook,
	IChatWebhookCreateInput,
	IChatWebhookUpdateInput
} from '@/core/types/interfaces/common/chat';

/**
 * A channel's incoming webhooks as its managers handle them (the Integrations dialog): who may, whether the platform
 * serves them, the form of one, and why a write failed. Pure, so the rules are tested without a component.
 */

/**
 * Whether the signed-in employee may manage a conversation's webhooks, as far as the client can tell: a channel, and
 * they manage chat (`canManageChat`, the roles that hold `CHAT_MANAGE`), manage the channel, or created it — the
 * platform's own rule. The platform decides: a refusal (403) hides the entry too.
 */
export function mayManageChatWebhooks(
	conversation: Pick<IChatConversationWithState, 'kind' | 'state' | 'createdByEmployeeId'>,
	meEmployeeId: string | null,
	canManageChat: boolean
): boolean {
	if (conversation.kind !== EChatConversationKind.Channel) return false;
	if (canManageChat || conversation.state?.role === EChatMemberRole.Manager) return true;
	return (
		!!meEmployeeId &&
		!!conversation.createdByEmployeeId &&
		String(conversation.createdByEmployeeId) === meEmployeeId
	);
}

/**
 * Whether the platform serves a channel's webhooks to me: not asked yet (`unknown`), answered (`available`), off on it
 * (`off`: a 404, where `GAUZY_CHAT_WEBHOOKS_ENABLED` is not `true` or the platform predates the routes), refused to me
 * (`forbidden`: a 403, I do not manage the channel), or a failure worth a retry (`failed`).
 */
export type TChatWebhooksAvailability = 'unknown' | 'available' | 'off' | 'forbidden' | 'failed';

export function webhooksAvailabilityOf(read: {
	isSuccess: boolean;
	isError: boolean;
	error: unknown;
}): TChatWebhooksAvailability {
	if (read.isError) {
		const status = errorStatusOf(read.error);
		if (status === 404) return 'off';
		if (status === 403) return 'forbidden';
		return 'failed';
	}
	return read.isSuccess ? 'available' : 'unknown';
}

/** Whether the Integrations entry shows: the platform listed the webhooks, or failed for a reason a retry may fix. */
export function canOpenWebhooks(availability: TChatWebhooksAvailability): boolean {
	return availability === 'available' || availability === 'failed';
}

/** The form of a webhook, new or edited: the URLs as typed (empty for none). */
export interface ChatWebhookForm {
	name: string;
	iconUrl: string;
	interactionUrl: string;
	canBroadcast: boolean;
}

export const EMPTY_WEBHOOK_FORM: ChatWebhookForm = { name: '', iconUrl: '', interactionUrl: '', canBroadcast: false };

/** The form that edits a webhook, filled with what it has. */
export function webhookFormOf(
	webhook: Pick<IChatWebhook, 'name' | 'iconUrl' | 'interactionUrl' | 'canBroadcast'>
): ChatWebhookForm {
	return {
		name: webhook.name,
		iconUrl: webhook.iconUrl ?? '',
		interactionUrl: webhook.interactionUrl ?? '',
		canBroadcast: !!webhook.canBroadcast
	};
}

/** A new webhook from its form: trimmed, an empty URL sent as none. */
export function webhookCreateInputOf(form: ChatWebhookForm): IChatWebhookCreateInput {
	return {
		name: form.name.trim(),
		iconUrl: form.iconUrl.trim() || null,
		interactionUrl: form.interactionUrl.trim() || null,
		canBroadcast: form.canBroadcast
	};
}

/** The changes a form makes to a webhook: only what differs; an emptied URL is `null`, which clears it. */
export function webhookChanges(
	webhook: Pick<IChatWebhook, 'name' | 'iconUrl' | 'interactionUrl' | 'canBroadcast'>,
	form: ChatWebhookForm
): IChatWebhookUpdateInput {
	const changes: IChatWebhookUpdateInput = {};
	const name = form.name.trim();
	if (name && name !== webhook.name) changes.name = name;
	const iconUrl = form.iconUrl.trim() || null;
	if (iconUrl !== (webhook.iconUrl ?? null)) changes.iconUrl = iconUrl;
	const interactionUrl = form.interactionUrl.trim() || null;
	if (interactionUrl !== (webhook.interactionUrl ?? null)) changes.interactionUrl = interactionUrl;
	if (form.canBroadcast !== !!webhook.canBroadcast) changes.canBroadcast = form.canBroadcast;
	return changes;
}

/** Whether the channel has as many webhooks as it may (revoked ones do not count): no new one until one is revoked. */
export function isWebhookLimitReached(webhooks: readonly Pick<IChatWebhook, 'revokedAt'>[]): boolean {
	return webhooks.filter((webhook) => !webhook.revokedAt).length >= CHAT_WEBHOOK_MAX_PER_CONVERSATION;
}

/** The list with a webhook as a write left it: in its place, or first when it is new (the list is newest first). */
export function withWebhook(webhooks: readonly IChatWebhook[], webhook: IChatWebhook): IChatWebhook[] {
	const at = webhooks.findIndex((item) => item.id === webhook.id);
	if (at === -1) return [webhook, ...webhooks];
	return webhooks.map((item, index) => (index === at ? webhook : item));
}

/** A webhook write, by what it does. */
export type TChatWebhookWriteKind = 'create' | 'update' | 'rotate' | 'revoke';

/**
 * Why a webhook write failed, as the key of its message: the caller does not manage the channel (403), the channel
 * has its 10 webhooks (409, or the platform's 400 that says so), the platform refused the values (400 / 422: a name,
 * an URL that is not https on a public host, a revoked webhook), the webhook or its channel is gone or webhooks are
 * off (404), or another failure.
 */
export type TChatWebhookFailure = 'FORBIDDEN' | 'FULL' | 'INVALID' | 'GONE' | 'FAILED';

/** The platform's refusal of a create past the limit: "A channel has at most 10 webhooks; revoke one first." */
const LIMIT_MESSAGE = /\bat most \d+ webhooks\b/i;

export function webhookFailureOf(
	error: unknown,
	kind: TChatWebhookWriteKind
): { reason: TChatWebhookFailure; detail: string | null } {
	const status = errorStatusOf(error);
	const detail = platformMessageOf(error);
	if (status === 403) return { reason: 'FORBIDDEN', detail: null };
	if (status === 404) return { reason: 'GONE', detail: null };
	const isLimit = kind === 'create' && (status === 409 || (status === 400 && !!detail && LIMIT_MESSAGE.test(detail)));
	if (isLimit) return { reason: 'FULL', detail: null };
	if (status === 400 || status === 409 || status === 422) return { reason: 'INVALID', detail };
	return { reason: 'FAILED', detail: null };
}
