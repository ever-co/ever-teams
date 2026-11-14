'use client';

import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { chatWebhooksService } from '@/core/services/client/api/chat/chat-webhooks.service';
import { isChatEnabled, isChatWebhooksEnabled } from '@/core/lib/utils/chat-enabled';
import { errorStatusOf } from '@/core/lib/utils/error-feedback';
import {
	canOpenWebhooks,
	mayManageChatWebhooks,
	webhooksAvailabilityOf,
	withWebhook,
	type TChatWebhooksAvailability,
	type TChatWebhookWriteKind
} from '@/core/lib/utils/chat-webhooks';
import type {
	IChatConversationWithState,
	IChatWebhook,
	IChatWebhookCreateInput,
	IChatWebhookUpdateInput,
	IChatWebhookWriteResult
} from '@/core/types/interfaces/common/chat';
import { useChatScope } from './use-chat-scope';

/** The list is read again when the dialog opens; between two openings it may be this old (counters move per post). */
const WEBHOOKS_STALE_MS = 60_000;

const NO_WEBHOOKS: IChatWebhook[] = [];

export interface ChatWebhooksList {
	webhooks: IChatWebhook[];
	availability: TChatWebhooksAvailability;
	/** Whether the conversation's Integrations entry shows: a channel I may manage, whose webhooks the platform lists. */
	canOpen: boolean;
	/** Whether the list was read (a read that failed since keeps the list it had). */
	isListed: boolean;
	isLoading: boolean;
	refresh: () => void;
}

/**
 * A channel's incoming webhooks (`/chat/conversations/:id/webhooks`), for the people who may manage them: behind
 * `NEXT_PUBLIC_CHAT_WEBHOOKS_ENABLED`, and only for a channel I manage (as far as the client knows), so nobody else's
 * page asks. The platform has the last word: where it answers 404 (its webhooks are off) or 403 (I do not manage the
 * channel), the entry stays hidden and nothing is asked again; another failure keeps the entry, whose dialog retries.
 */
export function useChatWebhooks(
	conversation: Pick<IChatConversationWithState, 'id' | 'kind' | 'state' | 'createdByEmployeeId'>,
	canManageChat: boolean
): ChatWebhooksList {
	const scope = useChatScope();
	const enabled =
		isChatEnabled() &&
		isChatWebhooksEnabled() &&
		scope !== null &&
		mayManageChatWebhooks(conversation, scope.employeeId, canManageChat);
	const query = useQuery({
		queryKey: queryKeys.chatWebhooks(scope?.tenantId, conversation.id),
		queryFn: ({ signal }) => chatWebhooksService.list(conversation.id, signal),
		enabled,
		staleTime: WEBHOOKS_STALE_MS,
		// Webhooks off (404) and a refusal (403) are answers, not failures: asked once.
		retry: (failureCount, error) => {
			const status = errorStatusOf(error);
			return status !== 403 && status !== 404 && failureCount < 1;
		}
	});
	const availability = enabled ? webhooksAvailabilityOf(query) : 'unknown';
	const { refetch } = query;
	const refresh = useCallback(() => {
		void refetch();
	}, [refetch]);

	return {
		webhooks: query.data ?? NO_WEBHOOKS,
		availability,
		canOpen: canOpenWebhooks(availability),
		isListed: enabled && query.data !== undefined,
		isLoading: enabled && query.isPending,
		refresh
	};
}

/** One write to a channel's webhooks. */
export type TChatWebhookWrite =
	| { kind: Extract<TChatWebhookWriteKind, 'create'>; input: IChatWebhookCreateInput }
	| { kind: Extract<TChatWebhookWriteKind, 'update'>; webhookId: string; changes: IChatWebhookUpdateInput }
	| { kind: Extract<TChatWebhookWriteKind, 'rotate' | 'revoke'>; webhookId: string };

function send(conversationId: string, write: TChatWebhookWrite): Promise<IChatWebhookWriteResult> {
	switch (write.kind) {
		case 'create':
			return chatWebhooksService.create(conversationId, write.input);
		case 'update':
			return chatWebhooksService.update(write.webhookId, write.changes);
		case 'rotate':
			return chatWebhooksService.rotateSecret(write.webhookId);
		case 'revoke':
			return chatWebhooksService.revoke(write.webhookId);
	}
}

interface ChatWebhookWrites {
	/** Runs a write; its answer (with the URL or signing secret it made, this once) goes to the caller only. */
	write: (write: TChatWebhookWrite) => Promise<IChatWebhookWriteResult>;
	isWriting: boolean;
}

/**
 * The writes to a channel's webhooks: create, change, a new signing secret, revoke. A read of the list still under way
 * is cancelled first (its older answer would undo the write), the webhook goes into the list as the platform answered,
 * and the list is read again once the write settled (a failed one too: the webhook may be gone, or webhooks off).
 * The URL and the signing secret in an answer are the caller's to show once: the list never holds them, and the
 * mutation keeps no copy (it is reset once settled, and dropped from its cache at once). Failures are the caller's to
 * word (they mean different things per write).
 */
export function useChatWebhookWrites(conversationId: string): ChatWebhookWrites {
	const scope = useChatScope();
	const queryClient = useQueryClient();
	const tenantId = scope?.tenantId;
	const mutation = useMutation({
		mutationFn: (write: TChatWebhookWrite) => send(conversationId, write),
		gcTime: 0,
		meta: { handlesOwnError: true },
		onMutate: async () => {
			await queryClient.cancelQueries({ queryKey: queryKeys.chatWebhooks(tenantId, conversationId) });
		},
		onSuccess: (result) => {
			queryClient.setQueryData<IChatWebhook[]>(queryKeys.chatWebhooks(tenantId, conversationId), (list) =>
				withWebhook(list ?? NO_WEBHOOKS, result.webhook)
			);
		},
		// Not awaited: the write's answer (and a secret in it) shows at once, the list catches up.
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.chatWebhooks(tenantId, conversationId) });
		}
	});
	const { mutateAsync, reset, isPending } = mutation;
	const write = useCallback(
		async (next: TChatWebhookWrite) => {
			try {
				return await mutateAsync(next);
			} finally {
				reset();
			}
		},
		[mutateAsync, reset]
	);

	return useMemo(() => ({ write, isWriting: isPending }), [isPending, write]);
}
