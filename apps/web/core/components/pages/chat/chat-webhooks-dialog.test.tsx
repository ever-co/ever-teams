/** @jest-environment jsdom */
/**
 * The Integrations dialog of a channel (its incoming webhooks), with the real data hooks over a stand-in for the
 * platform: the list, a create that shows the URL and signing secret once (copy buttons, the dialog held open until
 * "I have copied them", never shown again), edit, a new signing secret and revoke (both confirmed first), and the
 * refusals worded: 403, the limit of 10 (409), a refused value (422).
 */
import React, { useState } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import type { ChatPerson } from '@/core/lib/utils/chat-format';
import { EChatConversationKind, EChatMemberRole, IChatWebhook } from '@/core/types/interfaces/common/chat';

/** `key[name=value;…]`: the key, and the values the message was given. */
function translate(key: string, values?: Record<string, unknown>): string {
	if (!values) return key;
	return `${key}[${Object.entries(values)
		.map(([name, value]) => `${name}=${String(value)}`)
		.join(';')}]`;
}

jest.mock('next-intl', () => ({
	useLocale: () => 'en-US',
	useTranslations: () => translate
}));

// The dialog primitive is Base UI's (portal, focus trap): a stand-in that closes the way Escape or the overlay would.
jest.mock('@/core/components/common/dialog', () => {
	const ReactModule = jest.requireActual<typeof import('react')>('react');
	const Close = ReactModule.createContext<(open: boolean) => void>(() => undefined);
	return {
		Dialog: ({
			open,
			onOpenChange,
			children
		}: {
			open: boolean;
			onOpenChange: (open: boolean) => void;
			children: React.ReactNode;
		}) => (open ? <Close.Provider value={onOpenChange}>{children}</Close.Provider> : null),
		DialogContent: ({
			children,
			showCloseButton = true
		}: {
			children: React.ReactNode;
			showCloseButton?: boolean;
		}) => {
			const close = ReactModule.useContext(Close);
			return (
				<div role="dialog">
					{children}
					<button type="button" onClick={() => close(false)}>
						press-escape
					</button>
					{showCloseButton && (
						<button type="button" onClick={() => close(false)}>
							close-x
						</button>
					)}
				</div>
			);
		},
		DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
		DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
		DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>
	};
});

// The alert dialog primitive is Base UI's too: a stand-in with its two answers.
jest.mock('@/core/components/common/alert-dialog', () => {
	const Pass = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
	const Answer = ({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) => (
		<button type="button" onClick={onClick}>
			{children}
		</button>
	);
	return {
		AlertDialog: ({ open, children }: { open: boolean; children?: React.ReactNode }) =>
			open ? <>{children}</> : null,
		AlertDialogContent: ({ children }: { children?: React.ReactNode }) => <div role="alertdialog">{children}</div>,
		AlertDialogHeader: Pass,
		AlertDialogFooter: Pass,
		AlertDialogTitle: ({ children }: { children?: React.ReactNode }) => <h3>{children}</h3>,
		AlertDialogDescription: ({ children }: { children?: React.ReactNode }) => <p>{children}</p>,
		AlertDialogAction: Answer,
		AlertDialogCancel: Answer
	};
});

const mockList = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockRotate = jest.fn();
const mockRevoke = jest.fn();
jest.mock('@/core/services/client/api/chat/chat-webhooks.service', () => ({
	chatWebhooksService: {
		list: (...args: unknown[]) => mockList(...args),
		create: (...args: unknown[]) => mockCreate(...args),
		update: (...args: unknown[]) => mockUpdate(...args),
		rotateSecret: (...args: unknown[]) => mockRotate(...args),
		revoke: (...args: unknown[]) => mockRevoke(...args)
	}
}));
jest.mock('@/core/lib/utils/chat-enabled', () => ({ isChatEnabled: () => true, isChatWebhooksEnabled: () => true }));
jest.mock('@/core/hooks/chat/use-chat-scope', () => ({
	useChatScope: () => ({ tenantId: 'ten', organizationId: 'org', userId: 'usr', employeeId: 'e-ana' })
}));

import { useChatWebhooks } from '@/core/hooks/chat/use-chat-webhooks';
import { ChatWebhooksDialog } from './chat-webhooks-dialog';

const URL_SECRET = 'https://api.example.test/api/chat/hooks/hook_url-secret-1';
const SIGNING_SECRET = 'signing-secret-1';
const PEOPLE: ReadonlyMap<string, ChatPerson> = new Map([
	['e-ana', { employeeId: 'e-ana', userId: 'u-ana', name: 'Ana Lee', imageUrl: null }]
]);
const CHANNEL = {
	id: 'c1',
	kind: EChatConversationKind.Channel,
	state: { role: EChatMemberRole.Manager } as never,
	createdByEmployeeId: 'e-ana'
};

function webhook(id: string, extra: Partial<IChatWebhook> = {}): IChatWebhook {
	return {
		id,
		conversationId: 'c1',
		name: `Hook ${id}`,
		iconUrl: null,
		interactionUrl: null,
		tokenHint: `h${id}`,
		hasSigningSecret: true,
		canBroadcast: false,
		createdByEmployeeId: 'e-ana',
		createdAt: '2026-11-10T12:00:00.000Z',
		revokedAt: null,
		lastUsedAt: null,
		acceptedCount: 0,
		rejectedCount: 0,
		rateLimitedCount: 0,
		callbackFailureCount: 0,
		...extra
	};
}

/** The conversation's entry and dialog, as the conversation view wires them. */
function Harness() {
	const webhooks = useChatWebhooks(CHANNEL, false);
	const [open, setOpen] = useState(false);
	return (
		<>
			<button type="button" onClick={() => setOpen(true)} disabled={!webhooks.canOpen}>
				open-integrations
			</button>
			<ChatWebhooksDialog
				open={open}
				onOpenChange={setOpen}
				conversationId="c1"
				channelName="ops"
				webhooks={webhooks}
				people={PEOPLE}
			/>
		</>
	);
}

async function openDialog() {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	render(
		<QueryClientProvider client={client}>
			<Harness />
		</QueryClientProvider>
	);
	// A failed read is asked once more (after a second) before the entry offers a retry.
	await waitFor(
		() =>
			expect((screen.getByRole('button', { name: 'open-integrations' }) as HTMLButtonElement).disabled).toBe(
				false
			),
		{ timeout: 5000 }
	);
	fireEvent.click(screen.getByRole('button', { name: 'open-integrations' }));
	return screen.getByRole('dialog');
}

const writeText = jest.fn();

beforeEach(() => {
	jest.clearAllMocks();
	writeText.mockResolvedValue(undefined);
	Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
});

describe('ChatWebhooksDialog', () => {
	it('lists the channel’s webhooks: name, icon, creator, created, last used, counters and revoked', async () => {
		mockList.mockResolvedValue([
			webhook('w2', {
				name: 'Deploys',
				iconUrl: 'https://cdn.example.com/deploy.png',
				lastUsedAt: '2026-11-12T12:30:00.000Z',
				acceptedCount: 12,
				rejectedCount: 1,
				rateLimitedCount: 2,
				callbackFailureCount: 3
			}),
			webhook('w1', {
				name: 'Old alerts',
				iconUrl: 'http://cdn.example.com/plain.png',
				createdByEmployeeId: 'e-gone',
				revokedAt: '2026-11-11T08:00:00.000Z'
			})
		]);
		const dialog = await openDialog();

		expect(within(dialog).getByRole('heading').textContent).toBe('teamChat.WEBHOOKS.DIALOG_TITLE[name=ops]');
		const deploys = await within(dialog).findByText('Deploys');
		const row = deploys.closest('li') as HTMLElement;
		expect(row.querySelector('img[data-webhook-icon]')?.getAttribute('src')).toBe(
			'https://cdn.example.com/deploy.png'
		);
		expect(row.querySelector('img[data-webhook-icon]')?.getAttribute('referrerpolicy')).toBe('no-referrer');
		expect(row.textContent).toContain('teamChat.WEBHOOKS.CREATED_BY[name=Ana Lee;date=Nov 10, 2026]');
		expect(row.textContent).toContain('…hw2');
		expect(row.textContent).toContain('teamChat.WEBHOOKS.LAST_USED[date=Nov 12, 2026');
		expect(row.querySelector('[data-webhook-counts]')?.textContent).toBe(
			'teamChat.WEBHOOKS.COUNTS[accepted=12;rejected=1;limited=2;failures=3]'
		);
		expect(
			(
				within(row).getByRole('button', {
					name: 'teamChat.WEBHOOKS.REVOKE_NAMED[name=Deploys]'
				}) as HTMLButtonElement
			).disabled
		).toBe(false);

		const revoked = within(dialog).getByText('Old alerts').closest('li') as HTMLElement;
		expect(within(revoked).getByText('teamChat.WEBHOOKS.REVOKED')).toBeTruthy();
		expect(revoked.textContent).toContain('teamChat.WEBHOOKS.NEVER_USED');
		expect(revoked.textContent).toContain('name=teamChat.SOMEONE');
		// An icon that is not https shows the app mark; a revoked webhook offers no action.
		expect(revoked.querySelector('img')).toBeNull();
		expect(within(revoked).queryAllByRole('button')).toHaveLength(0);
		// The dialog read the list again as it opened (its counters move with each post).
		expect(mockList).toHaveBeenCalledTimes(2);
	});

	it('shows the URL and signing secret of a new webhook once, with copy buttons, and never again', async () => {
		mockList.mockResolvedValue([webhook('w1')]);
		mockCreate.mockResolvedValue({
			webhook: webhook('w9', { name: 'Alerts' }),
			url: URL_SECRET,
			signingSecret: SIGNING_SECRET
		});
		const dialog = await openDialog();
		await within(dialog).findByText('Hook w1');

		fireEvent.click(within(dialog).getByRole('button', { name: 'teamChat.WEBHOOKS.NEW' }));
		fireEvent.change(within(dialog).getByLabelText('teamChat.WEBHOOKS.NAME'), { target: { value: '  Alerts ' } });
		fireEvent.change(within(dialog).getByLabelText(/teamChat.WEBHOOKS.INTERACTION_URL/), {
			target: { value: 'https://hooks.example.com/click' }
		});
		fireEvent.click(within(dialog).getByRole('checkbox'));
		await act(async () => {
			fireEvent.click(within(dialog).getByRole('button', { name: 'teamChat.WEBHOOKS.CREATE' }));
		});

		expect(mockCreate).toHaveBeenCalledWith('c1', {
			name: 'Alerts',
			iconUrl: null,
			interactionUrl: 'https://hooks.example.com/click',
			canBroadcast: true
		});
		const shown = await within(dialog).findByRole('status');
		expect(shown.textContent).toContain('teamChat.WEBHOOKS.SHOWN_ONCE[name=Alerts]');
		expect((within(shown).getByLabelText('teamChat.WEBHOOKS.URL') as HTMLInputElement).value).toBe(URL_SECRET);
		expect((within(shown).getByLabelText('teamChat.WEBHOOKS.SIGNING_SECRET') as HTMLInputElement).value).toBe(
			SIGNING_SECRET
		);
		// The new webhook is first in the list.
		expect(within(dialog).getAllByRole('listitem')[0].textContent).toContain('Alerts');

		await act(async () => {
			fireEvent.click(within(shown).getByRole('button', { name: 'teamChat.WEBHOOKS.COPY_URL' }));
		});
		expect(writeText).toHaveBeenLastCalledWith(URL_SECRET);
		expect(within(shown).getByRole('button', { name: 'teamChat.WEBHOOKS.COPY_URL' }).textContent).toContain(
			'teamChat.WEBHOOKS.COPIED'
		);
		await act(async () => {
			fireEvent.click(within(shown).getByRole('button', { name: 'teamChat.WEBHOOKS.COPY_SECRET' }));
		});
		expect(writeText).toHaveBeenLastCalledWith(SIGNING_SECRET);

		// Closed now, they could not be shown again: Escape and the overlay keep the dialog open, and there is no ×.
		expect(within(dialog).queryByRole('button', { name: 'close-x' })).toBeNull();
		fireEvent.click(within(dialog).getByRole('button', { name: 'press-escape' }));
		expect(screen.getByRole('dialog')).toBe(dialog);
		// No other write that makes a secret meanwhile.
		expect(
			(within(dialog).getByRole('button', { name: 'teamChat.WEBHOOKS.NEW' }) as HTMLButtonElement).disabled
		).toBe(true);

		fireEvent.click(within(shown).getByRole('button', { name: 'teamChat.WEBHOOKS.DONE' }));
		expect(within(dialog).queryByRole('status')).toBeNull();
		expect(document.body.innerHTML).not.toContain(SIGNING_SECRET);
		expect(document.body.innerHTML).not.toContain('hook_url-secret-1');

		fireEvent.click(within(dialog).getByRole('button', { name: 'close-x' }));
		expect(screen.queryByRole('dialog')).toBeNull();
		mockList.mockResolvedValue([webhook('w9', { name: 'Alerts' }), webhook('w1')]);
		fireEvent.click(screen.getByRole('button', { name: 'open-integrations' }));
		await within(screen.getByRole('dialog')).findByText('Alerts');
		expect(screen.queryByRole('status')).toBeNull();
		expect(document.body.innerHTML).not.toContain(SIGNING_SECRET);
		expect(document.body.innerHTML).not.toContain('hook_url-secret-1');
	});

	it('revokes only once confirmed', async () => {
		mockList.mockResolvedValue([webhook('w1', { name: 'Alerts' })]);
		mockRevoke.mockResolvedValue({
			webhook: webhook('w1', { name: 'Alerts', revokedAt: '2026-11-13T09:00:00.000Z' })
		});
		const dialog = await openDialog();
		const revoke = await within(dialog).findByRole('button', {
			name: 'teamChat.WEBHOOKS.REVOKE_NAMED[name=Alerts]'
		});

		fireEvent.click(revoke);
		const asked = screen.getByRole('alertdialog');
		expect(within(asked).getByRole('heading').textContent).toBe('teamChat.WEBHOOKS.REVOKE_NAMED[name=Alerts]');
		expect(asked.textContent).toContain('teamChat.WEBHOOKS.REVOKE_CONFIRM[name=Alerts]');
		fireEvent.click(within(asked).getByRole('button', { name: 'teamChat.CANCEL' }));
		expect(mockRevoke).not.toHaveBeenCalled();
		expect(screen.queryByRole('alertdialog')).toBeNull();

		fireEvent.click(revoke);
		await act(async () => {
			fireEvent.click(
				within(screen.getByRole('alertdialog')).getByRole('button', { name: 'teamChat.WEBHOOKS.REVOKE' })
			);
		});
		expect(mockRevoke).toHaveBeenCalledWith('w1');
		await within(dialog).findByText('teamChat.WEBHOOKS.REVOKED');
		expect(
			within(dialog).queryByRole('button', { name: 'teamChat.WEBHOOKS.REVOKE_NAMED[name=Alerts]' })
		).toBeNull();
	});

	it('makes a new signing secret only once confirmed, and shows it once', async () => {
		mockList.mockResolvedValue([webhook('w1', { name: 'Alerts' })]);
		mockRotate.mockResolvedValue({ webhook: webhook('w1', { name: 'Alerts' }), signingSecret: 'signing-secret-2' });
		const dialog = await openDialog();

		fireEvent.click(
			await within(dialog).findByRole('button', { name: 'teamChat.WEBHOOKS.ROTATE_NAMED[name=Alerts]' })
		);
		const asked = screen.getByRole('alertdialog');
		expect(within(asked).getByRole('heading').textContent).toBe('teamChat.WEBHOOKS.ROTATE_NAMED[name=Alerts]');
		expect(asked.textContent).toContain('teamChat.WEBHOOKS.ROTATE_CONFIRM[name=Alerts]');
		fireEvent.click(within(asked).getByRole('button', { name: 'teamChat.CANCEL' }));
		expect(mockRotate).not.toHaveBeenCalled();

		fireEvent.click(within(dialog).getByRole('button', { name: 'teamChat.WEBHOOKS.ROTATE_NAMED[name=Alerts]' }));
		await act(async () => {
			fireEvent.click(
				within(screen.getByRole('alertdialog')).getByRole('button', { name: 'teamChat.WEBHOOKS.ROTATE' })
			);
		});
		expect(mockRotate).toHaveBeenCalledWith('w1');
		const shown = await within(dialog).findByRole('status');
		expect((within(shown).getByLabelText('teamChat.WEBHOOKS.SIGNING_SECRET') as HTMLInputElement).value).toBe(
			'signing-secret-2'
		);
		// A new secret has no URL to show: the URL is shown by the create only.
		expect(within(shown).queryByLabelText('teamChat.WEBHOOKS.URL')).toBeNull();
		fireEvent.click(within(shown).getByRole('button', { name: 'teamChat.WEBHOOKS.DONE' }));
		expect(document.body.innerHTML).not.toContain('signing-secret-2');
	});

	it('saves the fields an edit changed only', async () => {
		mockList.mockResolvedValue([
			webhook('w1', { name: 'Alerts', interactionUrl: 'https://hooks.example.com/click' })
		]);
		mockUpdate.mockResolvedValue({ webhook: webhook('w1', { name: 'Ops alerts' }) });
		const dialog = await openDialog();

		fireEvent.click(
			await within(dialog).findByRole('button', { name: 'teamChat.WEBHOOKS.EDIT_NAMED[name=Alerts]' })
		);
		fireEvent.change(within(dialog).getByLabelText('teamChat.WEBHOOKS.NAME'), { target: { value: 'Ops alerts' } });
		fireEvent.change(within(dialog).getByLabelText(/teamChat.WEBHOOKS.INTERACTION_URL/), { target: { value: '' } });
		await act(async () => {
			fireEvent.click(within(dialog).getByRole('button', { name: 'teamChat.SAVE' }));
		});

		expect(mockUpdate).toHaveBeenCalledWith('w1', { name: 'Ops alerts', interactionUrl: null });
		await within(dialog).findByText('Ops alerts');
	});

	it.each([
		[
			'a member who does not manage the channel (403)',
			new ApiErrorService('Only a manager of this conversation can do that.', 403),
			'FORBIDDEN',
			'teamChat.WEBHOOKS.FORBIDDEN',
			null
		],
		[
			'the limit of 10 webhooks (409)',
			new ApiErrorService('Conflict', 409),
			'FULL',
			'teamChat.WEBHOOKS.FULL[max=10]',
			null
		],
		[
			'a refused value (422)',
			new ApiErrorService('An icon URL must be https on a public host.', 422),
			'INVALID',
			'teamChat.WEBHOOKS.INVALID',
			'An icon URL must be https on a public host.'
		]
	])('words a create refused for %s', async (_case, error, reason, message, detail) => {
		mockList.mockResolvedValue([]);
		mockCreate.mockRejectedValue(error);
		const dialog = await openDialog();
		await within(dialog).findByText('teamChat.WEBHOOKS.EMPTY');

		fireEvent.click(within(dialog).getByRole('button', { name: 'teamChat.WEBHOOKS.NEW' }));
		fireEvent.change(within(dialog).getByLabelText('teamChat.WEBHOOKS.NAME'), { target: { value: 'Alerts' } });
		await act(async () => {
			fireEvent.click(within(dialog).getByRole('button', { name: 'teamChat.WEBHOOKS.CREATE' }));
		});

		const alert = await within(dialog).findByRole('alert');
		expect(alert.getAttribute('data-webhooks-error')).toBe(reason);
		expect(alert.firstElementChild?.textContent).toMatch(new RegExp(`^${message.replace(/[[\]]/g, '\\$&')}$`));
		if (detail) expect(alert.textContent).toContain(detail);
		expect(within(dialog).queryByRole('status')).toBeNull();
		// A failed write keeps nothing locked: the dialog closes again.
		fireEvent.click(within(dialog).getByRole('button', { name: 'press-escape' }));
		expect(screen.queryByRole('dialog')).toBeNull();
	});

	it('offers no new webhook once the channel has 10', async () => {
		mockList.mockResolvedValue(Array.from({ length: 10 }, (_, index) => webhook(`w${index}`)));
		const dialog = await openDialog();
		await within(dialog).findByText('Hook w0');

		expect(
			(within(dialog).getByRole('button', { name: 'teamChat.WEBHOOKS.NEW' }) as HTMLButtonElement).disabled
		).toBe(true);
		expect(within(dialog).getByText('teamChat.WEBHOOKS.FULL[max=10]')).toBeTruthy();
	});

	it('says webhooks are off when the platform stops serving them (404) while it is open', async () => {
		mockList
			.mockResolvedValueOnce([webhook('w1')])
			.mockRejectedValue(new ApiErrorService('Cannot GET /api/chat/conversations/c1/webhooks', 404));
		const dialog = await openDialog();

		await within(dialog).findByText('teamChat.WEBHOOKS.OFF');
		expect(within(dialog).queryByRole('list')).toBeNull();
		// The conversation's entry goes with it.
		expect((screen.getByRole('button', { name: 'open-integrations' }) as HTMLButtonElement).disabled).toBe(true);
	});

	it('keeps a URL and secret on screen until dismissed, even when webhooks go off meanwhile', async () => {
		mockList.mockResolvedValue([]);
		mockCreate.mockResolvedValue({
			webhook: webhook('w9', { name: 'Alerts' }),
			url: URL_SECRET,
			signingSecret: SIGNING_SECRET
		});
		mockRevoke.mockRejectedValue(new ApiErrorService('The requested record was not found', 404));
		const dialog = await openDialog();
		await within(dialog).findByText('teamChat.WEBHOOKS.EMPTY');

		fireEvent.click(within(dialog).getByRole('button', { name: 'teamChat.WEBHOOKS.NEW' }));
		fireEvent.change(within(dialog).getByLabelText('teamChat.WEBHOOKS.NAME'), { target: { value: 'Alerts' } });
		await act(async () => {
			fireEvent.click(within(dialog).getByRole('button', { name: 'teamChat.WEBHOOKS.CREATE' }));
		});
		await within(dialog).findByRole('status');
		// Revoked at once (the URL leaked?), but the platform answers 404: webhooks were turned off meanwhile.
		mockList.mockRejectedValue(new ApiErrorService('Cannot GET /api/chat/conversations/c1/webhooks', 404));
		fireEvent.click(within(dialog).getByRole('button', { name: 'teamChat.WEBHOOKS.REVOKE_NAMED[name=Alerts]' }));
		await act(async () => {
			fireEvent.click(
				within(screen.getByRole('alertdialog')).getByRole('button', { name: 'teamChat.WEBHOOKS.REVOKE' })
			);
		});

		await within(dialog).findByText('teamChat.WEBHOOKS.OFF');
		expect(within(dialog).getByRole('alert').getAttribute('data-webhooks-error')).toBe('GONE');
		const shown = within(dialog).getByRole('status');
		expect((within(shown).getByLabelText('teamChat.WEBHOOKS.SIGNING_SECRET') as HTMLInputElement).value).toBe(
			SIGNING_SECRET
		);
		fireEvent.click(within(shown).getByRole('button', { name: 'teamChat.WEBHOOKS.DONE' }));
		fireEvent.click(within(dialog).getByRole('button', { name: 'close-x' }));
		expect(screen.queryByRole('dialog')).toBeNull();
	});

	it('offers a retry, and no empty list, when the webhooks cannot be read', async () => {
		mockList.mockRejectedValue(new ApiErrorService('Bad gateway', 502));
		const dialog = await openDialog();

		// The dialog reads the list again as it opens (once more after a second when that fails too).
		const failed = await within(dialog).findByRole('alert', {}, { timeout: 5000 });
		expect(failed.textContent).toContain('teamChat.WEBHOOKS.LOAD_FAILED');
		expect(within(dialog).queryByText('teamChat.WEBHOOKS.EMPTY')).toBeNull();
		expect(within(dialog).queryByRole('button', { name: 'teamChat.WEBHOOKS.NEW' })).toBeNull();

		mockList.mockResolvedValue([webhook('w1', { name: 'Alerts' })]);
		fireEvent.click(within(failed).getByRole('button', { name: 'teamChat.RETRY' }));
		await within(dialog).findByText('Alerts');
		expect(within(dialog).queryByRole('alert')).toBeNull();
	});
});
