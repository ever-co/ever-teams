/** @jest-environment jsdom */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ChatPerson } from '@/core/lib/utils/chat-format';
import {
	APP_INTERACTION_POLL_MAX,
	APP_INTERACTION_POLL_MS,
	appBlocksOf,
	appButtonKey,
	appButtonStateOf,
	appClickFailureOf,
	blocksBody,
	blocksText,
	bodyRepeatsBlocks,
	buttonLinkOf,
	httpsUrlOf
} from '@/core/lib/utils/chat-app-blocks';
import { CHAT_MESSAGE_MAX_LENGTH, IChatAppBlock, IChatMessage } from '@/core/types/interfaces/common/chat';
import { ChatAppBlocks } from './chat-app-blocks';
import { MessageItem } from './message-item';

jest.mock('next-intl', () => ({
	useLocale: () => 'en-US',
	useTranslations: () => (key: string) => key
}));
jest.mock('./chat-markdown', () => ({
	ChatMarkdown: ({ body }: { body: string }) => <div data-testid="body">{body}</div>
}));
jest.mock('./emoji-popover', () => ({ EmojiPopover: () => null }));
const mockInteract = jest.fn();
const mockInteraction = jest.fn();
const mockMessages = jest.fn();
jest.mock('@/core/services/client/api/chat/chat.service', () => ({
	chatService: {
		interact: (...args: unknown[]) => mockInteract(...args),
		interaction: (...args: unknown[]) => mockInteraction(...args),
		messages: (...args: unknown[]) => mockMessages(...args)
	}
}));

const BLOCKS: IChatAppBlock[] = [
	{ type: 'header', text: 'CPU high <b>now</b>' },
	{ type: 'section', text: 'api-1 at 97%', fields: ['Env\nprod', 'Since 10:02'] },
	{ type: 'divider' },
	{ type: 'context', elements: ['monitor 7', 'eu-west'] },
	{
		type: 'actions',
		blockId: 'alert-7',
		elements: [
			{ actionId: 'ack', text: 'Acknowledge', style: 'primary' },
			{ actionId: 'open', text: 'Open', url: 'https://monitor.example.com/7' },
			{ actionId: 'bad', text: 'Bad link', url: 'javascript:alert(1)' }
		]
	}
];

function appMessage(extra: Partial<IChatMessage> = {}): IChatMessage {
	return {
		id: 'm1',
		conversationId: 'c1',
		kind: 'app',
		body: 'CPU high on api-1',
		appName: 'Monitor',
		appIconUrl: 'https://cdn.example.com/monitor.png',
		blocks: BLOCKS,
		mentionsChannel: false,
		mentionsHere: false,
		alsoInConversation: false,
		replyCount: 0,
		createdAt: new Date(2026, 10, 11, 10, 0).toISOString(),
		...extra
	};
}

const interaction = (status: string) => ({ interactionId: 'i-1', messageId: 'm1', conversationId: 'c1', actionId: 'ack', status, attempts: 1, replyApplied: false });

describe('chat app blocks (helpers)', () => {
	it('reads the blocks of an app message only, and skips types it does not know', () => {
		expect(appBlocksOf(appMessage({ blocks: [...BLOCKS, { type: 'video' } as unknown as IChatAppBlock] }))).toEqual(BLOCKS);
		expect(appBlocksOf(appMessage({ kind: 'message' }))).toEqual([]);
		expect(appBlocksOf(appMessage({ blocks: null }))).toEqual([]);
	});

	it('knows a body that only repeats its blocks', () => {
		expect(blocksText(BLOCKS)).toBe('CPU high <b>now</b>\napi-1 at 97%\nEnv\nprod\nSince 10:02\nmonitor 7 · eu-west');
		expect(bodyRepeatsBlocks(blocksText(BLOCKS), BLOCKS)).toBe(true);
		expect(bodyRepeatsBlocks('CPU high on api-1', BLOCKS)).toBe(false);
		expect(bodyRepeatsBlocks('x', [])).toBe(false);
	});

	it('knows a long blocks-only body the platform cut to the message length, with its ellipsis', () => {
		const long: IChatAppBlock[] = [
			{ type: 'header', text: 'Nightly report' },
			{ type: 'section', text: 'x '.repeat(1500).trim() },
			{ type: 'section', text: 'y '.repeat(1500).trim() }
		];
		const text = blocksText(long);
		expect(text.length).toBeGreaterThan(CHAT_MESSAGE_MAX_LENGTH);
		const body = `${text.slice(0, CHAT_MESSAGE_MAX_LENGTH - 1).trimEnd()}…`;
		expect(blocksBody(long)).toBe(body);
		expect(bodyRepeatsBlocks(body, long)).toBe(true);
		expect(bodyRepeatsBlocks(text, long)).toBe(false);
	});

	it('opens https links only, and maps the platform answers', () => {
		expect(buttonLinkOf({ url: 'https://monitor.example.com/7' })).toBe('https://monitor.example.com/7');
		expect(buttonLinkOf({ url: 'http://monitor.example.com/7' })).toBeNull();
		expect(httpsUrlOf('javascript:alert(1)')).toBeNull();
		expect(httpsUrlOf('not a url')).toBeNull();
		expect(appButtonKey('a', 'ack')).not.toBe(appButtonKey('b', 'ack'));
		expect(appButtonStateOf('delivered')).toBe('done');
		expect(appButtonStateOf('retrying')).toBe('pending');
		expect(appButtonStateOf('failed')).toBe('failed');
		expect(appClickFailureOf(409)).toBe('APP_NO_INTERACTIONS');
		expect(appClickFailureOf(404)).toBe('APP_GONE');
		expect(appClickFailureOf(500)).toBe('APP_CLICK_FAILED');
	});
});

describe('ChatAppBlocks', () => {
	beforeEach(() => {
		mockInteract.mockReset();
		mockInteraction.mockReset();
		mockMessages.mockReset();
	});

	it('renders the title, fields side by side, divider, context and buttons as plain text', () => {
		const { container } = render(<ChatAppBlocks message={appMessage()} />);
		expect(screen.getByText('CPU high <b>now</b>')).toBeTruthy();
		expect(container.querySelector('b')).toBeNull();
		expect(container.querySelectorAll('[data-app-fields] > div')).toHaveLength(2);
		expect(container.querySelector('hr')).toBeTruthy();
		expect(screen.getByText('monitor 7 · eu-west')).toBeTruthy();
		const link = screen.getByText('Open').closest('a') as HTMLAnchorElement;
		expect(link.getAttribute('href')).toBe('https://monitor.example.com/7');
		expect(link.getAttribute('rel')).toContain('noopener');
		// A link that is not https is not a link.
		expect(screen.getByText('Bad link').closest('a')).toBeNull();
	});

	it('clicks through the platform, shows the click done, and hands up the replaced message', async () => {
		const replaced = appMessage({ body: 'Acknowledged by Ana', blocks: [] });
		mockInteract.mockResolvedValue({ interaction: { ...interaction('delivered'), replyApplied: true }, message: replaced, events: [] });
		const onReplaced = jest.fn();
		render(<ChatAppBlocks message={appMessage()} onReplaced={onReplaced} />);
		await act(async () => {
			fireEvent.click(screen.getByText('Acknowledge'));
		});
		expect(mockInteract).toHaveBeenCalledWith('m1', 'ack', 'alert-7');
		expect(onReplaced).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1' }), replaced);
		expect(screen.getByLabelText('teamChat.APP_DONE')).toBeTruthy();
	});

	it('stays pending while the callback is retried, then shows the failure', async () => {
		jest.useFakeTimers();
		try {
			mockInteract.mockResolvedValue({ interaction: interaction('retrying'), events: [] });
			mockInteraction.mockResolvedValueOnce(interaction('retrying')).mockResolvedValueOnce(interaction('failed'));
			render(<ChatAppBlocks message={appMessage()} />);
			await act(async () => {
				fireEvent.click(screen.getByText('Acknowledge'));
			});
			const button = screen.getByText('Acknowledge').closest('button') as HTMLButtonElement;
			expect(button.disabled).toBe(true);
			await act(async () => {
				await jest.advanceTimersByTimeAsync(3000);
			});
			expect(button.disabled).toBe(true);
			await act(async () => {
				await jest.advanceTimersByTimeAsync(3000);
			});
			expect(mockInteraction).toHaveBeenCalledTimes(2);
			expect(button.disabled).toBe(false);
			expect(screen.getByRole('alert').textContent).toBe('teamChat.APP_CALLBACK_FAILED');
		} finally {
			jest.useRealTimers();
		}
	});

	it('reads the message again when a retried callback was answered with a reply, and hands it up', async () => {
		jest.useFakeTimers();
		try {
			const replaced = appMessage({ body: 'Acknowledged by Ana', blocks: [] });
			mockInteract.mockResolvedValue({ interaction: interaction('retrying'), events: [] });
			mockInteraction.mockResolvedValueOnce({ ...interaction('delivered'), replyApplied: true });
			mockMessages.mockResolvedValue({ messages: [appMessage({ id: 'm0' }), replaced], hasBefore: true, hasAfter: false });
			const onReplaced = jest.fn();
			render(<ChatAppBlocks message={appMessage()} onReplaced={onReplaced} />);
			await act(async () => {
				fireEvent.click(screen.getByText('Acknowledge'));
			});
			await act(async () => {
				await jest.advanceTimersByTimeAsync(APP_INTERACTION_POLL_MS);
			});
			expect(mockMessages).toHaveBeenCalledWith('c1', { around: 'm1', limit: 1 });
			expect(onReplaced).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1' }), replaced);
			expect(screen.getByLabelText('teamChat.APP_DONE')).toBeTruthy();
		} finally {
			jest.useRealTimers();
		}
	});

	it('frees the button and says so when the callback is still retried after the chat stops asking', async () => {
		jest.useFakeTimers();
		try {
			mockInteract.mockResolvedValue({ interaction: interaction('retrying'), events: [] });
			mockInteraction.mockResolvedValue(interaction('retrying'));
			render(<ChatAppBlocks message={appMessage()} />);
			await act(async () => {
				fireEvent.click(screen.getByText('Acknowledge'));
			});
			await act(async () => {
				await jest.advanceTimersByTimeAsync(APP_INTERACTION_POLL_MS * APP_INTERACTION_POLL_MAX);
			});
			const button = screen.getByText('Acknowledge').closest('button') as HTMLButtonElement;
			expect(mockInteraction).toHaveBeenCalledTimes(APP_INTERACTION_POLL_MAX);
			expect(button.disabled).toBe(false);
			expect(screen.getByRole('alert').textContent).toBe('teamChat.APP_NO_ANSWER_YET');
			expect(mockMessages).not.toHaveBeenCalled();
		} finally {
			jest.useRealTimers();
		}
	});

	it('sends no click from a read-only (archived) message', async () => {
		render(<ChatAppBlocks message={appMessage()} readOnly />);
		const button = screen.getByText('Acknowledge').closest('button') as HTMLButtonElement;
		expect(button.disabled).toBe(true);
		await act(async () => {
			fireEvent.click(button);
		});
		expect(mockInteract).not.toHaveBeenCalled();
	});

	it('says why a click was refused', async () => {
		mockInteract.mockRejectedValue({ response: { status: 409 } });
		render(<ChatAppBlocks message={appMessage()} />);
		await act(async () => {
			fireEvent.click(screen.getByText('Acknowledge'));
		});
		expect(screen.getByRole('alert').textContent).toBe('teamChat.APP_NO_INTERACTIONS');
	});
});

describe('MessageItem with app messages', () => {
	const ANA: ChatPerson = { employeeId: 'employee-ana', userId: 'user-ana', name: 'Ana Silva' };
	const handlers = {
		onReact: jest.fn(),
		onReply: jest.fn(),
		onEdit: jest.fn(),
		onDelete: jest.fn(),
		onPin: jest.fn(),
		onUnreadFrom: jest.fn(),
		onRetry: jest.fn(),
		onDiscard: jest.fn(),
		onCopyLink: jest.fn(),
		onOpenTask: jest.fn()
	};
	const item = (message: IChatMessage, readOnly?: boolean) => (
		<MessageItem
			readOnly={readOnly}
			message={message}
			author={null}
			people={new Map([[ANA.employeeId, ANA]])}
			conversationNames={new Map()}
			meEmployeeId="employee-me"
			meUserId="user-me"
			locale="en-US"
			continues={false}
			inTimeline
			canManage={false}
			taskTitles={new Map()}
			{...handlers}
		/>
	);
	const flag = process.env.NEXT_PUBLIC_CHAT_WEBHOOKS_ENABLED;
	afterEach(() => {
		if (flag === undefined) delete process.env.NEXT_PUBLIC_CHAT_WEBHOOKS_ENABLED;
		else process.env.NEXT_PUBLIC_CHAT_WEBHOOKS_ENABLED = flag;
	});

	it('shows the App badge, the app icon and the blocks with NEXT_PUBLIC_CHAT_WEBHOOKS_ENABLED', () => {
		process.env.NEXT_PUBLIC_CHAT_WEBHOOKS_ENABLED = 'true';
		const { container } = render(item(appMessage()));
		expect(screen.getByText('Monitor')).toBeTruthy();
		expect(container.querySelector('[data-app-badge]')?.textContent).toBe('teamChat.APP_BADGE');
		expect(container.querySelector('[data-app-icon]')?.getAttribute('src')).toBe('https://cdn.example.com/monitor.png');
		expect(container.querySelector('[data-app-blocks]')).toBeTruthy();
		expect(screen.getByTestId('body').textContent).toBe('CPU high on api-1');
	});

	it('does not show a body that only repeats the blocks', () => {
		process.env.NEXT_PUBLIC_CHAT_WEBHOOKS_ENABLED = 'true';
		render(item(appMessage({ body: blocksText(BLOCKS) })));
		expect(screen.queryByTestId('body')).toBeNull();
	});

	it('disables the buttons of an app message in an archived conversation', () => {
		process.env.NEXT_PUBLIC_CHAT_WEBHOOKS_ENABLED = 'true';
		render(item(appMessage(), true));
		expect((screen.getByText('Acknowledge').closest('button') as HTMLButtonElement).disabled).toBe(true);
	});

	it('shows the text only, as before, with the flag off', () => {
		delete process.env.NEXT_PUBLIC_CHAT_WEBHOOKS_ENABLED;
		const { container } = render(item(appMessage()));
		expect(container.querySelector('[data-app-badge]')).toBeNull();
		expect(container.querySelector('[data-app-blocks]')).toBeNull();
		expect(container.querySelector('[data-app-icon]')).toBeNull();
		expect(screen.getByTestId('body').textContent).toBe('CPU high on api-1');
	});
});
