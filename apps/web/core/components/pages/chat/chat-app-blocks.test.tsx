/** @jest-environment jsdom */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ChatPerson } from '@/core/lib/utils/chat-format';
import {
	APP_INTERACTION_POLL_MAX,
	APP_INTERACTION_POLL_MS,
	APP_INTERACTION_RETRY_DELAYS_MS,
	APP_INTERACTION_TIMEOUT_MS,
	appBlocksOf,
	appButtonKey,
	appButtonStateOf,
	appClickFailureOf,
	blocksBody,
	blocksText,
	bodyRepeatsBlocks,
	buttonLinkOf,
	httpsUrlOf,
	isUnansweredClick,
	keepsClickKey
} from '@/core/lib/utils/chat-app-blocks';
import { CHAT_MESSAGE_MAX_LENGTH, IChatAppBlock, IChatMessage } from '@/core/types/interfaces/common/chat';
import { ApiErrorService } from '@/core/services/client/api-error.service';
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
// The task card reads the task and changes it: tested on its own (chat-task-card.test.tsx). Its hooks load the
// app's task stores, which an app message's test has no use for.
jest.mock('./chat-task-card', () => ({ ChatTaskCard: () => null }));
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

	it('sends a click again only when it got no answer that settles it, twice', () => {
		for (const status of [0, undefined, null, 408, 429, 502, 503, 504]) expect(isUnansweredClick(status)).toBe(true);
		for (const status of [200, 400, 401, 403, 404, 409, 500]) expect(isUnansweredClick(status)).toBe(false);
		expect(APP_INTERACTION_RETRY_DELAYS_MS).toEqual([1000, 3000]);
		expect(APP_INTERACTION_TIMEOUT_MS).toBe(15_000);
	});

	it('keeps a click’s key after no answer or a server error, and lets a refusal settle it', () => {
		for (const status of [0, undefined, 408, 429, 500, 502, 503, 504]) expect(keepsClickKey(status)).toBe(true);
		for (const status of [400, 401, 403, 404, 409, 422]) expect(keepsClickKey(status)).toBe(false);
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
		expect(mockInteract).toHaveBeenCalledWith('m1', 'ack', 'alert-7', expect.stringMatching(/\S/), APP_INTERACTION_TIMEOUT_MS);
		expect(onReplaced).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1' }), { ...replaced, readOrder: expect.any(Number) });
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
			expect(onReplaced).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1' }), { ...replaced, readOrder: expect.any(Number) });
			expect(screen.getByLabelText('teamChat.APP_DONE')).toBeTruthy();
		} finally {
			jest.useRealTimers();
		}
	});

	it('asks once more about a delivery without its reply, and reads the reply applied just after', async () => {
		jest.useFakeTimers();
		try {
			const replaced = appMessage({ body: 'Acknowledged by Ana', blocks: [] });
			mockInteract.mockResolvedValue({ interaction: interaction('retrying'), events: [] });
			mockInteraction.mockResolvedValueOnce(interaction('delivered')).mockResolvedValueOnce({ ...interaction('delivered'), replyApplied: true });
			mockMessages.mockResolvedValue({ messages: [replaced], hasBefore: false, hasAfter: false });
			const onReplaced = jest.fn();
			render(<ChatAppBlocks message={appMessage()} onReplaced={onReplaced} />);
			await act(async () => {
				fireEvent.click(screen.getByText('Acknowledge'));
			});
			await act(async () => {
				await jest.advanceTimersByTimeAsync(APP_INTERACTION_POLL_MS * 2);
			});
			expect(mockInteraction).toHaveBeenCalledTimes(2);
			expect(onReplaced).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1' }), { ...replaced, readOrder: expect.any(Number) });
		} finally {
			jest.useRealTimers();
		}
	});

	it('keeps the button pending, and so disabled, while it asks once more after a delivery', async () => {
		jest.useFakeTimers();
		try {
			let answerSecond: (value: unknown) => void = () => undefined;
			mockInteract.mockResolvedValue({ interaction: interaction('retrying'), events: [] });
			mockInteraction.mockResolvedValueOnce(interaction('delivered')).mockImplementationOnce(() => new Promise((resolve) => (answerSecond = resolve)));
			render(<ChatAppBlocks message={appMessage()} />);
			await act(async () => {
				fireEvent.click(screen.getByText('Acknowledge'));
			});
			await act(async () => {
				await jest.advanceTimersByTimeAsync(APP_INTERACTION_POLL_MS * 2);
			});
			const button = screen.getByText('Acknowledge').closest('button') as HTMLButtonElement;
			expect(button.disabled).toBe(true);
			await act(async () => {
				fireEvent.click(button);
			});
			expect(mockInteract).toHaveBeenCalledTimes(1);
			await act(async () => {
				answerSecond(interaction('delivered'));
			});
			expect(button.disabled).toBe(false);
			expect(screen.getByLabelText('teamChat.APP_DONE')).toBeTruthy();
		} finally {
			jest.useRealTimers();
		}
	});

	it('asks again after a failed ask instead of calling the click failed', async () => {
		jest.useFakeTimers();
		try {
			mockInteract.mockResolvedValue({ interaction: interaction('retrying'), events: [] });
			mockInteraction.mockRejectedValueOnce({ response: { status: 503 } }).mockResolvedValue(interaction('delivered'));
			render(<ChatAppBlocks message={appMessage()} />);
			await act(async () => {
				fireEvent.click(screen.getByText('Acknowledge'));
			});
			await act(async () => {
				await jest.advanceTimersByTimeAsync(APP_INTERACTION_POLL_MS);
			});
			const button = screen.getByText('Acknowledge').closest('button') as HTMLButtonElement;
			expect(button.disabled).toBe(true);
			expect(screen.queryByRole('alert')).toBeNull();
			await act(async () => {
				await jest.advanceTimersByTimeAsync(APP_INTERACTION_POLL_MS * 2);
			});
			expect(screen.getByLabelText('teamChat.APP_DONE')).toBeTruthy();
		} finally {
			jest.useRealTimers();
		}
	});

	it('ends the asking as gone when the platform answers 404 (as the API service reports it)', async () => {
		jest.useFakeTimers();
		try {
			mockInteract.mockResolvedValue({ interaction: interaction('retrying'), events: [] });
			mockInteraction.mockRejectedValue(ApiErrorService.fromAxiosError({ message: 'Not Found', status: 404, response: { status: 404, data: { message: 'Not Found' } } }));
			render(<ChatAppBlocks message={appMessage()} />);
			await act(async () => {
				fireEvent.click(screen.getByText('Acknowledge'));
			});
			await act(async () => {
				await jest.advanceTimersByTimeAsync(APP_INTERACTION_POLL_MS);
			});
			expect(mockInteraction).toHaveBeenCalledTimes(1);
			expect(screen.getByRole('alert').textContent).toBe('teamChat.APP_GONE');
			expect((screen.getByText('Acknowledge').closest('button') as HTMLButtonElement).disabled).toBe(false);
		} finally {
			jest.useRealTimers();
		}
	});

	it('maps a refused click from the API service to its reason', async () => {
		mockInteract.mockRejectedValue(ApiErrorService.fromAxiosError({ message: 'Conflict', status: 409, response: { status: 409, data: { message: 'Conflict' } } }));
		render(<ChatAppBlocks message={appMessage()} />);
		await act(async () => {
			fireEvent.click(screen.getByText('Acknowledge'));
		});
		expect(screen.getByRole('alert').textContent).toBe('teamChat.APP_NO_INTERACTIONS');
	});

	it('stops after that one more look when no reply came', async () => {
		jest.useFakeTimers();
		try {
			mockInteract.mockResolvedValue({ interaction: interaction('retrying'), events: [] });
			mockInteraction.mockResolvedValue(interaction('delivered'));
			render(<ChatAppBlocks message={appMessage()} />);
			await act(async () => {
				fireEvent.click(screen.getByText('Acknowledge'));
			});
			await act(async () => {
				await jest.advanceTimersByTimeAsync(APP_INTERACTION_POLL_MS * 5);
			});
			expect(mockInteraction).toHaveBeenCalledTimes(2);
			expect(mockMessages).not.toHaveBeenCalled();
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

	describe('idempotency key', () => {
		const delivered = () => ({ interaction: interaction('delivered'), events: [] });
		/** The key each request carried (the fourth argument of `chatService.interact`). */
		const keys = () => mockInteract.mock.calls.map((call) => call[3] as string);
		const click = async (text = 'Acknowledge') => {
			await act(async () => {
				fireEvent.click(screen.getByText(text));
			});
		};
		/** A request that got no answer, as the API service reports it (no HTTP status). */
		const lost = () => ApiErrorService.fromAxiosError({ message: 'Network Error', code: 'ERR_NETWORK' });

		it('gives each click a key of its own, and the next click a new one', async () => {
			mockInteract.mockResolvedValue(delivered());
			render(<ChatAppBlocks message={appMessage()} />);
			await click();
			await click();
			expect(keys()).toHaveLength(2);
			expect(keys()[0]).toMatch(/\S/);
			expect(keys()[0].length).toBeLessThanOrEqual(64);
			expect(keys()[1]).not.toBe(keys()[0]);
		});

		it('sends one click for a double click, before the button re-renders', async () => {
			mockInteract.mockImplementation(() => new Promise(() => undefined));
			render(<ChatAppBlocks message={appMessage()} />);
			const button = screen.getByText('Acknowledge');
			await act(async () => {
				fireEvent.click(button);
				fireEvent.click(button);
			});
			expect(mockInteract).toHaveBeenCalledTimes(1);
		});

		it('sends a click that got no answer again with the same key, and settles on the answer', async () => {
			jest.useFakeTimers();
			try {
				mockInteract
					.mockRejectedValueOnce(lost())
					.mockRejectedValueOnce(ApiErrorService.fromAxiosError({ message: 'Gateway Timeout', status: 504, response: { status: 504, data: {} } }))
					.mockResolvedValueOnce(delivered());
				render(<ChatAppBlocks message={appMessage()} />);
				await click();
				const button = screen.getByText('Acknowledge').closest('button') as HTMLButtonElement;
				expect(button.disabled).toBe(true);
				await act(async () => {
					await jest.advanceTimersByTimeAsync(APP_INTERACTION_RETRY_DELAYS_MS[0] + APP_INTERACTION_RETRY_DELAYS_MS[1]);
				});
				expect(keys()).toHaveLength(3);
				expect(new Set(keys()).size).toBe(1);
				expect(screen.getByLabelText('teamChat.APP_DONE')).toBeTruthy();
				expect(screen.queryByRole('alert')).toBeNull();
			} finally {
				jest.useRealTimers();
			}
		});

		it('says a click that never got an answer failed, and sends its key again on the next click of the button', async () => {
			jest.useFakeTimers();
			try {
				mockInteract.mockRejectedValueOnce(lost()).mockRejectedValueOnce(lost()).mockRejectedValueOnce(lost()).mockResolvedValue(delivered());
				render(<ChatAppBlocks message={appMessage()} />);
				await click();
				await act(async () => {
					await jest.advanceTimersByTimeAsync(APP_INTERACTION_RETRY_DELAYS_MS[0] + APP_INTERACTION_RETRY_DELAYS_MS[1]);
				});
				expect(keys()).toHaveLength(1 + APP_INTERACTION_RETRY_DELAYS_MS.length);
				expect(screen.getByRole('alert').textContent).toBe('teamChat.APP_CLICK_FAILED');
				// The platform may have taken it: the next click is the same click.
				await click();
				expect(new Set(keys()).size).toBe(1);
				expect(screen.getByLabelText('teamChat.APP_DONE')).toBeTruthy();
				// Answered: the click after it is a new one.
				await click();
				expect(keys()[keys().length - 1]).not.toBe(keys()[0]);
			} finally {
				jest.useRealTimers();
			}
		});

		it('does not send a click again after a server error, but keeps its key for the next click (the app may have been called)', async () => {
			jest.useFakeTimers();
			try {
				mockInteract
					.mockRejectedValueOnce(ApiErrorService.fromAxiosError({ message: 'Internal Server Error', status: 500, response: { status: 500, data: { message: 'Internal Server Error' } } }))
					.mockResolvedValue(delivered());
				render(<ChatAppBlocks message={appMessage()} />);
				await click();
				await act(async () => {
					await jest.advanceTimersByTimeAsync(APP_INTERACTION_RETRY_DELAYS_MS[0] + APP_INTERACTION_RETRY_DELAYS_MS[1]);
				});
				expect(keys()).toHaveLength(1);
				expect(screen.getByRole('alert').textContent).toBe('teamChat.APP_CLICK_FAILED');
				await click();
				expect(keys()).toEqual([keys()[0], keys()[0]]);
			} finally {
				jest.useRealTimers();
			}
		});

		it('sends a click that timed out again with its key (a hung request counts as unanswered)', async () => {
			jest.useFakeTimers();
			try {
				mockInteract.mockRejectedValueOnce(ApiErrorService.fromAxiosError({ message: 'timeout of 15000ms exceeded', code: 'ECONNABORTED' })).mockResolvedValueOnce(delivered());
				render(<ChatAppBlocks message={appMessage()} />);
				await click();
				await act(async () => {
					await jest.advanceTimersByTimeAsync(APP_INTERACTION_RETRY_DELAYS_MS[0]);
				});
				expect(keys()).toHaveLength(2);
				expect(keys()[1]).toBe(keys()[0]);
				// Each send carries the deadline.
				expect(mockInteract.mock.calls.every((call) => call[4] === APP_INTERACTION_TIMEOUT_MS)).toBe(true);
				expect(screen.getByLabelText('teamChat.APP_DONE')).toBeTruthy();
			} finally {
				jest.useRealTimers();
			}
		});

		it('keeps a repeat answered as delivered without its reply pending, and reads the reply the first request applied', async () => {
			jest.useFakeTimers();
			try {
				const replaced = appMessage({ body: 'Acknowledged by Ana', blocks: [] });
				mockInteract.mockResolvedValue({ interaction: interaction('delivered'), events: [], replayed: true });
				mockInteraction.mockResolvedValue({ ...interaction('delivered'), replyApplied: true });
				mockMessages.mockResolvedValue({ messages: [replaced] });
				const onReplaced = jest.fn();
				render(<ChatAppBlocks message={appMessage()} onReplaced={onReplaced} />);
				await click();
				expect((screen.getByText('Acknowledge').closest('button') as HTMLButtonElement).disabled).toBe(true);
				await act(async () => {
					await jest.advanceTimersByTimeAsync(APP_INTERACTION_POLL_MS);
				});
				expect(mockMessages).toHaveBeenCalledWith('c1', { around: 'm1', limit: 1 });
				expect(onReplaced).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1' }), { ...replaced, readOrder: expect.any(Number) });
				expect(screen.getByLabelText('teamChat.APP_DONE')).toBeTruthy();
			} finally {
				jest.useRealTimers();
			}
		});

		it('keeps a delivery the repeat already reported when the one more ask fails or finds the click gone', async () => {
			jest.useFakeTimers();
			try {
				mockInteract.mockResolvedValue({ interaction: interaction('delivered'), events: [], replayed: true });
				mockInteraction.mockRejectedValue(ApiErrorService.fromAxiosError({ message: 'Not Found', status: 404, response: { status: 404, data: { message: 'Not Found' } } }));
				render(<ChatAppBlocks message={appMessage()} />);
				await click();
				await act(async () => {
					await jest.advanceTimersByTimeAsync(APP_INTERACTION_POLL_MS);
				});
				expect(mockInteraction).toHaveBeenCalledTimes(1);
				expect(screen.getByLabelText('teamChat.APP_DONE')).toBeTruthy();
				expect(screen.queryByRole('alert')).toBeNull();
			} finally {
				jest.useRealTimers();
			}
		});

		it('asks only once more after a repeat reported the delivery, and ends done without a reply', async () => {
			jest.useFakeTimers();
			try {
				mockInteract.mockResolvedValue({ interaction: interaction('delivered'), events: [], replayed: true });
				mockInteraction.mockResolvedValue(interaction('delivered'));
				render(<ChatAppBlocks message={appMessage()} />);
				await click();
				await act(async () => {
					await jest.advanceTimersByTimeAsync(APP_INTERACTION_POLL_MS * 3);
				});
				expect(mockInteraction).toHaveBeenCalledTimes(1);
				expect(mockMessages).not.toHaveBeenCalled();
				expect(screen.getByLabelText('teamChat.APP_DONE')).toBeTruthy();
			} finally {
				jest.useRealTimers();
			}
		});

		it('does not ask again about a first answer delivered without a reply (the app sent none)', async () => {
			jest.useFakeTimers();
			try {
				mockInteract.mockResolvedValue(delivered());
				render(<ChatAppBlocks message={appMessage()} />);
				await click();
				await act(async () => {
					await jest.advanceTimersByTimeAsync(APP_INTERACTION_POLL_MS * 3);
				});
				expect(mockInteraction).not.toHaveBeenCalled();
			} finally {
				jest.useRealTimers();
			}
		});

		it('does not send an answered refusal again, and gives the next click a new key', async () => {
			jest.useFakeTimers();
			try {
				mockInteract
					.mockRejectedValueOnce(ApiErrorService.fromAxiosError({ message: 'Not Found', status: 404, response: { status: 404, data: { message: 'Not Found' } } }))
					.mockResolvedValue(delivered());
				render(<ChatAppBlocks message={appMessage()} />);
				await click();
				await act(async () => {
					await jest.advanceTimersByTimeAsync(APP_INTERACTION_RETRY_DELAYS_MS[0] + APP_INTERACTION_RETRY_DELAYS_MS[1]);
				});
				expect(keys()).toHaveLength(1);
				expect(screen.getByRole('alert').textContent).toBe('teamChat.APP_GONE');
				await click();
				expect(keys()).toHaveLength(2);
				expect(keys()[1]).not.toBe(keys()[0]);
			} finally {
				jest.useRealTimers();
			}
		});
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

	it('shows the placeholder instead of an app icon that did not load', () => {
		process.env.NEXT_PUBLIC_CHAT_WEBHOOKS_ENABLED = 'true';
		const { container } = render(item(appMessage()));
		fireEvent.error(container.querySelector('[data-app-icon]') as HTMLImageElement);
		expect(container.querySelector('[data-app-icon]')).toBeNull();
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
