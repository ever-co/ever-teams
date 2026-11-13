import { APIService } from '@/core/services/client/api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import type {
	IChatWebhook,
	IChatWebhookCreateInput,
	IChatWebhookUpdateInput,
	IChatWebhookWriteResult
} from '@/core/types/interfaces/common/chat';

const path = (id: string) => encodeURIComponent(id);

/**
 * Client of the platform's incoming webhook management (ever-gauzy #11799): a channel's webhooks, for its managers,
 * its creator and `CHAT_MANAGE` holders. Both transports (this app's `/api/chat/*` proxies, or the platform directly).
 * Every route answers 404 where the platform's webhooks are off (`GAUZY_CHAT_WEBHOOKS_ENABLED`), 403 to a member who
 * does not manage the channel.
 *
 * The bodies hold the webhook's fields only, never the tenant or organization ids `APIService` adds by default (the
 * routes take none: the session names them). The answer of a write holds the URL or the signing secret it made, this
 * once: the caller shows it and keeps it nowhere.
 */
class ChatWebhooksService extends APIService {
	/** The channel's webhooks, newest first, revoked ones included. */
	list = async (conversationId: string, signal?: AbortSignal): Promise<IChatWebhook[]> => {
		const response = await this.get<IChatWebhook[]>(`/chat/conversations/${path(conversationId)}/webhooks`, {
			signal
		});
		return Array.isArray(response.data) ? response.data : [];
	};

	/** A new webhook (at most `CHAT_WEBHOOK_MAX_PER_CONVERSATION` per channel): its URL and signing secret, this once. */
	create = async (conversationId: string, input: IChatWebhookCreateInput): Promise<IChatWebhookWriteResult> => {
		const response = await this.post<IChatWebhookWriteResult>(
			`/chat/conversations/${path(conversationId)}/webhooks`,
			{ ...input },
			undefined,
			false
		);
		return response.data;
	};

	/** Renames a webhook, or changes its icon, interaction URL or broadcast right (only the fields named). */
	update = async (webhookId: string, changes: IChatWebhookUpdateInput): Promise<IChatWebhookWriteResult> => {
		const response = await this.patch<IChatWebhookWriteResult>(
			`/chat/webhooks/${path(webhookId)}`,
			{ ...changes },
			undefined,
			false
		);
		return response.data;
	};

	/** A new signing secret for the interaction callbacks, this once; the old one stops working. */
	rotateSecret = async (webhookId: string): Promise<IChatWebhookWriteResult> => {
		const response = await this.post<IChatWebhookWriteResult>(
			`/chat/webhooks/${path(webhookId)}/secret`,
			{},
			undefined,
			false
		);
		return response.data;
	};

	/** Revokes a webhook: its URL answers 404 from then on (the record stays, for the history). */
	revoke = async (webhookId: string): Promise<IChatWebhookWriteResult> => {
		const response = await this.delete<IChatWebhookWriteResult>(`/chat/webhooks/${path(webhookId)}`);
		return response.data;
	};
}

export const chatWebhooksService = new ChatWebhooksService(GAUZY_API_BASE_SERVER_URL.value);
