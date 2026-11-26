/** @jest-environment jsdom */
import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { createStore, Provider, type PrimitiveAtom } from 'jotai';
import { readChatHistory } from '@/core/components/features/chat-panel/chat-history';
import { useAssistantChat } from './use-assistant-chat';

type TestMessage = { id: string; role: 'user' | 'assistant'; parts: Array<{ type: 'text'; text: string }> };
type FinishResult = { messages: TestMessage[]; isAbort: boolean };

/** A stand-in for the AI SDK's Chat: it records what the views do to it, without a network. */
interface MockChat {
	id: string;
	messages: TestMessage[];
	status: 'ready' | 'submitted' | 'streaming';
	stop: jest.Mock;
	sendMessage: jest.Mock;
	finish: (result: FinishResult) => void;
}

jest.mock(
	'@ai-sdk/react',
	() => {
		const created: unknown[] = [];
		class Chat {
			id: string;
			messages: TestMessage[];
			status = 'ready';
			error = undefined;
			stop = jest.fn(async () => undefined);
			private readonly onFinish?: (result: FinishResult) => void;

			constructor(init: { id: string; messages?: TestMessage[]; onFinish?: (result: FinishResult) => void }) {
				this.id = init.id;
				this.messages = init.messages ?? [];
				this.onFinish = init.onFinish;
				created.push(this);
			}

			sendMessage = jest.fn(async ({ text }: { text: string }) => {
				this.messages = [
					...this.messages,
					{ id: `${this.id}-user`, role: 'user', parts: [{ type: 'text', text }] },
					{ id: `${this.id}-answer`, role: 'assistant', parts: [{ type: 'text', text: 'Half an ans' }] }
				];
				this.status = 'streaming';
			});

			finish(result: FinishResult) {
				this.status = 'ready';
				this.onFinish?.(result);
			}
		}
		// What a view reads from useChat when it is handed an instance: that instance's state, and its own stop.
		const useChat = ({ chat }: { chat: Chat }) => ({
			id: chat.id,
			messages: chat.messages,
			status: chat.status,
			error: chat.error,
			stop: chat.stop,
			sendMessage: chat.sendMessage,
			regenerate: jest.fn(),
			setMessages: jest.fn()
		});
		return { Chat, useChat, created };
	},
	// Virtual: the AI SDK is not needed to run this test, so it also runs where it is not installed.
	{ virtual: true }
);
jest.mock(
	'ai',
	() => ({
		DefaultChatTransport: class DefaultChatTransport {}
	}),
	{ virtual: true }
);
jest.mock('@/core/stores', () => {
	const { atom } = jest.requireActual<typeof import('jotai')>('jotai');
	return {
		userState: atom<{ id: string } | null>(null),
		activeWorkspaceIdState: atom<string | null>('workspace-a'),
		activeTeamIdState: atom<string | null>('team-a')
	};
});
jest.mock('@/core/hooks/ai/use-ai-config', () => ({
	useAiConfig: () => ({ config: null, isConfigured: true, saveConfig: jest.fn() })
}));
jest.mock('@/core/hooks/ai/use-server-ai-availability', () => ({
	useServerAiAvailability: () => ({ hasServerAi: true, isChecking: false })
}));

const stores = jest.requireMock<{
	userState: PrimitiveAtom<{ id: string } | null>;
	activeTeamIdState: PrimitiveAtom<string | null>;
}>('@/core/stores');
const aiSdk = jest.requireMock<{ created: MockChat[] }>('@ai-sdk/react');

/** One signed-in person; each test signs in someone else, so the conversations of one test never reach another. */
function signedInStore(userId: string) {
	const store = createStore();
	store.set(stores.userState, { id: userId });
	return store;
}

/** One Ever SI view (the desktop panel, the phone sheet or the full page): each mounts its own useAssistantChat. */
function mountView(store: ReturnType<typeof createStore>) {
	const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
	return renderHook(() => useAssistantChat(), { wrapper });
}

function chatWithId(id: string) {
	return aiSdk.created.find((chat) => chat.id === id) as MockChat;
}

function ask(view: ReturnType<typeof mountView>, text: string) {
	act(() => view.result.current.setInput(text));
	act(() => view.result.current.submitInput());
}

describe('Ever SI conversation across views', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('keeps the running answer when the view changes: panel, phone sheet, full page and back', () => {
		const store = signedInStore('user-views');
		const panel = mountView(store);
		ask(panel, 'Plan my week');
		const sessionId = panel.result.current.sessionId;
		const chat = chatWithId(sessionId);
		const createdSoFar = aiSdk.created.length;
		expect(panel.result.current.isStreaming).toBe(true);

		// The window narrows past the phone breakpoint: the panel unmounts, the sheet mounts.
		panel.unmount();
		const sheet = mountView(store);
		expect(sheet.result.current.sessionId).toBe(sessionId);
		expect(sheet.result.current.isStreaming).toBe(true);
		expect(sheet.result.current.messages).toHaveLength(2);

		// Open full page: the sheet goes, the /assistant page takes the same conversation over.
		sheet.unmount();
		const page = mountView(store);
		expect(page.result.current.sessionId).toBe(sessionId);
		expect(page.result.current.isStreaming).toBe(true);

		// And back to the panel
		page.unmount();
		const panelAgain = mountView(store);
		expect(panelAgain.result.current.sessionId).toBe(sessionId);

		// One conversation all along: no view started its own, none stopped the answer
		expect(aiSdk.created).toHaveLength(createdSoFar);
		expect(chat.stop).not.toHaveBeenCalled();
	});

	it('lets an answer finish in the background when the panel closes, and saves it to the history', () => {
		const store = signedInStore('user-closed');
		const panel = mountView(store);
		ask(panel, 'Summarize the sprint');
		const chat = chatWithId(panel.result.current.sessionId);

		panel.unmount();
		expect(chat.stop).not.toHaveBeenCalled();
		act(() => chat.finish({ messages: chat.messages, isAbort: false }));

		const history = readChatHistory({ userId: 'user-closed', workspaceId: 'workspace-a', teamId: 'team-a' });
		expect(history.map((session) => session.id)).toEqual([chat.id]);
		expect(history[0].title).toBe('Summarize the sprint');
	});

	it('stops the running answer on New chat, and every view then opens the new conversation', () => {
		const store = signedInStore('user-new-chat');
		const panel = mountView(store);
		ask(panel, 'Draft a status update');
		const first = chatWithId(panel.result.current.sessionId);

		act(() => panel.result.current.startNewChat());

		expect(first.stop).toHaveBeenCalledTimes(1);
		const newId = panel.result.current.sessionId;
		expect(newId).not.toBe(first.id);
		panel.unmount();
		expect(mountView(store).result.current.sessionId).toBe(newId);
	});

	it('keeps a deleted conversation deleted when its stopped answer ends', () => {
		const store = signedInStore('user-delete');
		const panel = mountView(store);
		ask(panel, 'Write a task');
		const chat = chatWithId(panel.result.current.sessionId);

		act(() => panel.result.current.deleteConversation());
		expect(chat.stop).toHaveBeenCalledTimes(1);
		// The aborted request reports its end after the delete
		act(() => chat.finish({ messages: chat.messages, isAbort: true }));

		const history = readChatHistory({ userId: 'user-delete', workspaceId: 'workspace-a', teamId: 'team-a' });
		expect(history.some((session) => session.id === chat.id)).toBe(false);
	});

	it('stops the answer of the team the person leaves', () => {
		const store = signedInStore('user-team-switch');
		const view = mountView(store);
		ask(view, 'Prioritize my work');
		const teamAChat = chatWithId(view.result.current.sessionId);

		act(() => store.set(stores.activeTeamIdState, 'team-b'));

		expect(view.result.current.sessionId).not.toBe(teamAChat.id);
		expect(teamAChat.stop).toHaveBeenCalledTimes(1);
	});
});
