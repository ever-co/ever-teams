/**
 * @jest-environment jsdom
 */
/**
 * The data of the Integrations entry: asked only for a channel I may manage (where the flag is on), hidden where the
 * platform answers 404 (its webhooks off) or 403 (not mine to manage), kept for a failure a retry may fix. A write puts
 * the webhook into the list, and the URL and signing secret it answers go to the caller only.
 */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { EChatConversationKind, EChatMemberRole, IChatWebhook } from '@/core/types/interfaces/common/chat';

const mockList = jest.fn();
const mockCreate = jest.fn();
const mockRevoke = jest.fn();
let mockWebhooksOn = true;

jest.mock('@/core/services/client/api/chat/chat-webhooks.service', () => ({
	chatWebhooksService: {
		list: (...args: unknown[]) => mockList(...args),
		create: (...args: unknown[]) => mockCreate(...args),
		revoke: (...args: unknown[]) => mockRevoke(...args)
	}
}));
jest.mock('@/core/lib/utils/chat-enabled', () => ({
	isChatEnabled: () => true,
	isChatWebhooksEnabled: () => mockWebhooksOn
}));
jest.mock('./use-chat-scope', () => ({
	useChatScope: () => ({ tenantId: 'ten', organizationId: 'org', userId: 'usr', employeeId: 'me' })
}));

import { queryKeys } from '@/core/query/keys';
import { useChatWebhooks, useChatWebhookWrites } from './use-chat-webhooks';

function webhook(id: string, extra: Partial<IChatWebhook> = {}): IChatWebhook {
	return {
		id,
		conversationId: 'c1',
		name: `Hook ${id}`,
		tokenHint: 'ab12',
		hasSigningSecret: true,
		canBroadcast: false,
		acceptedCount: 0,
		rejectedCount: 0,
		rateLimitedCount: 0,
		callbackFailureCount: 0,
		...extra
	};
}

const MANAGED = {
	id: 'c1',
	kind: EChatConversationKind.Channel,
	state: { role: EChatMemberRole.Manager } as never,
	createdByEmployeeId: 'other'
};
const NOT_MANAGED = { ...MANAGED, state: { role: EChatMemberRole.Member } as never };

function setup() {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
	return { client, wrapper };
}

beforeEach(() => {
	jest.clearAllMocks();
	mockWebhooksOn = true;
});

describe('useChatWebhooks', () => {
	it('lists the webhooks of a channel I manage, and opens the entry', async () => {
		mockList.mockResolvedValue([webhook('w1')]);
		const { result } = renderHook(() => useChatWebhooks(MANAGED, false), { wrapper: setup().wrapper });

		await waitFor(() => expect(result.current.availability).toBe('available'));
		expect(result.current.canOpen).toBe(true);
		expect(result.current.webhooks.map((item) => item.id)).toEqual(['w1']);
		expect(mockList).toHaveBeenCalledWith('c1', expect.any(AbortSignal));
	});

	it('asks nothing where the flag is off, or for a conversation I may not manage', () => {
		mockWebhooksOn = false;
		const off = renderHook(() => useChatWebhooks(MANAGED, true), { wrapper: setup().wrapper });
		mockWebhooksOn = true;
		const member = renderHook(() => useChatWebhooks(NOT_MANAGED, false), { wrapper: setup().wrapper });
		const direct = renderHook(() => useChatWebhooks({ ...MANAGED, kind: EChatConversationKind.Direct }, true), {
			wrapper: setup().wrapper
		});

		expect(mockList).not.toHaveBeenCalled();
		for (const hook of [off, member, direct]) {
			expect(hook.result.current.availability).toBe('unknown');
			expect(hook.result.current.canOpen).toBe(false);
		}
	});

	it('hides the entry where the platform answers 404 (webhooks off), and asks once', async () => {
		mockList.mockRejectedValue(new ApiErrorService('Cannot GET /api/chat/conversations/c1/webhooks', 404));
		const { result } = renderHook(() => useChatWebhooks(MANAGED, false), { wrapper: setup().wrapper });

		await waitFor(() => expect(result.current.availability).toBe('off'));
		expect(result.current.canOpen).toBe(false);
		expect(mockList).toHaveBeenCalledTimes(1);
	});

	it('hides the entry where the platform refuses me (403), and asks once', async () => {
		mockList.mockRejectedValue(new ApiErrorService('Only a manager of this conversation can do that.', 403));
		// A chat manager by role, whom the platform still refuses: its answer wins.
		const { result } = renderHook(() => useChatWebhooks(NOT_MANAGED, true), { wrapper: setup().wrapper });

		await waitFor(() => expect(result.current.availability).toBe('forbidden'));
		expect(result.current.canOpen).toBe(false);
		expect(mockList).toHaveBeenCalledTimes(1);
	});

	it('keeps the entry for another failure, whose dialog retries', async () => {
		mockList.mockRejectedValue(new ApiErrorService('Bad gateway', 502));
		const { result } = renderHook(() => useChatWebhooks(MANAGED, false), { wrapper: setup().wrapper });

		await waitFor(() => expect(result.current.availability).toBe('failed'), { timeout: 5000 });
		expect(result.current.canOpen).toBe(true);
	});
});

describe('useChatWebhookWrites', () => {
	it('cancels a list read under way, whose older answer would undo the write, and reads the list again after', async () => {
		const { wrapper } = setup();
		let answerOldRead: (list: IChatWebhook[]) => void = () => undefined;
		mockList
			// The probe of the entry.
			.mockResolvedValueOnce([webhook('w1')])
			// The read as the dialog opens, still under way when the create is sent: the old list.
			.mockImplementationOnce(() => new Promise<IChatWebhook[]>((resolve) => (answerOldRead = resolve)))
			// The read once the write settled.
			.mockResolvedValue([webhook('w2'), webhook('w1')]);
		mockCreate.mockResolvedValue({
			webhook: webhook('w2'),
			url: 'https://api.example.test/hook/url-secret',
			signingSecret: 'signing-secret-1'
		});
		const { result } = renderHook(
			() => ({ list: useChatWebhooks(MANAGED, false), writes: useChatWebhookWrites('c1') }),
			{
				wrapper
			}
		);
		await waitFor(() => expect(result.current.list.availability).toBe('available'));
		act(() => result.current.list.refresh());
		await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));

		await act(async () => {
			await result.current.writes.write({ kind: 'create', input: { name: 'Hook w2' } });
		});
		await act(async () => {
			answerOldRead([webhook('w1')]);
			await Promise.resolve();
		});

		await waitFor(() => expect(mockList).toHaveBeenCalledTimes(3));
		await waitFor(() => expect(result.current.list.webhooks.map((item) => item.id)).toEqual(['w2', 'w1']));
	});

	it('puts a new webhook first in the list, and its URL and secret nowhere but the answer', async () => {
		const { client, wrapper } = setup();
		const key = queryKeys.chatWebhooks('ten', 'c1');
		client.setQueryData(key, [webhook('w1')]);
		const created = {
			webhook: webhook('w2', { name: 'Alerts' }),
			url: 'https://api.example.test/api/chat/hooks/hook_url-secret',
			signingSecret: 'signing-secret-1'
		};
		mockCreate.mockResolvedValue(created);
		const { result } = renderHook(() => useChatWebhookWrites('c1'), { wrapper });

		let answer: unknown;
		await act(async () => {
			answer = await result.current.write({ kind: 'create', input: { name: 'Alerts' } });
		});

		expect(mockCreate).toHaveBeenCalledWith('c1', { name: 'Alerts' });
		expect(answer).toEqual(created);
		expect((client.getQueryData(key) as IChatWebhook[]).map((item) => item.id)).toEqual(['w2', 'w1']);
		expect(
			JSON.stringify(
				client
					.getQueryCache()
					.getAll()
					.map((query) => query.state.data)
			)
		).not.toContain('signing-secret-1');
		expect(
			JSON.stringify(
				client
					.getQueryCache()
					.getAll()
					.map((query) => query.state.data)
			)
		).not.toContain('hook_url-secret');
		// The mutation keeps no copy of the answer once it settled.
		await waitFor(() => expect(client.getMutationCache().getAll()).toHaveLength(0));
		expect(result.current.isWriting).toBe(false);
	});

	it('puts a revoked webhook in its place, and hands a refusal to the caller', async () => {
		const { client, wrapper } = setup();
		const key = queryKeys.chatWebhooks('ten', 'c1');
		client.setQueryData(key, [webhook('w2'), webhook('w1')]);
		mockRevoke.mockResolvedValueOnce({ webhook: webhook('w1', { revokedAt: '2026-11-13T09:00:00.000Z' }) });
		const { result } = renderHook(() => useChatWebhookWrites('c1'), { wrapper });

		await act(async () => {
			await result.current.write({ kind: 'revoke', webhookId: 'w1' });
		});
		const list = client.getQueryData(key) as IChatWebhook[];
		expect(list.map((item) => [item.id, item.revokedAt ?? null])).toEqual([
			['w2', null],
			['w1', '2026-11-13T09:00:00.000Z']
		]);

		mockRevoke.mockRejectedValueOnce(new ApiErrorService('Only a manager of this conversation can do that.', 403));
		await act(async () => {
			await expect(result.current.write({ kind: 'revoke', webhookId: 'w2' })).rejects.toMatchObject({
				statusCode: 403
			});
		});
		expect(client.getQueryData(key)).toBe(list);
	});
});
