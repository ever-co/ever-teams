/** @jest-environment jsdom */
/**
 * `/workspace/new` (#5025): the workspace's name, its first team's (it follows the workspace's name until edited) and
 * the members invited; what stops a creation is said, with the way out.
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

// The notices animate unless the reader asks for reduced motion: jsdom has no matchMedia
beforeAll(() => {
	window.matchMedia = jest
		.fn()
		.mockReturnValue({ matches: true, addEventListener: jest.fn(), removeEventListener: jest.fn() });
});

const mockMutate = jest.fn();
const mockCreation = { mutate: mockMutate, isPending: false, isSuccess: false, isError: false, error: null as unknown };
const mockUser = { current: { isEmailVerified: true } as Record<string, unknown> };

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		values ? `${key} ${JSON.stringify(values)}` : key
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock('@/core/components/layouts/default-layout', () => ({
	PageLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));
jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({ data: mockUser.current })
}));
jest.mock('@/core/hooks/auth/use-create-workspace', () => ({
	...jest.requireActual('@/core/hooks/auth/use-create-workspace'),
	useCreateWorkspace: () => mockCreation
}));

import { getDefaultStore } from 'jotai';
import { timerStatusState } from '@/core/stores';
import { CreateWorkspacePage } from './create-workspace-page';

describe('CreateWorkspacePage', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockUser.current = { isEmailVerified: true };
		Object.assign(mockCreation, { isPending: false, isSuccess: false, isError: false, error: null });
	});

	const type = (label: string, value: string) =>
		fireEvent.change(screen.getByLabelText(new RegExp(label)), { target: { value } });

	it('names the first team after the workspace until it is named, and sends the valid invitations', async () => {
		render(<CreateWorkspacePage />);

		type('workspaceCreation.NAME_LABEL', 'Lovelace Studio');
		expect(screen.getByLabelText(/workspaceCreation.TEAM_LABEL/)).toHaveProperty('value', 'Lovelace Studio');
		type('workspaceCreation.TEAM_LABEL', 'Design');
		type('workspaceCreation.NAME_LABEL', 'Lovelace & Co');
		expect(screen.getByLabelText(/workspaceCreation.TEAM_LABEL/)).toHaveProperty('value', 'Design');
		type('workspaceCreation.INVITES_LABEL', 'Grace@Ever.co, alan@ever.co\ngrace@ever.co');
		fireEvent.click(screen.getByRole('button', { name: 'workspaceCreation.CREATE' }));

		await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1));
		expect(mockMutate).toHaveBeenCalledWith({
			name: 'Lovelace & Co',
			teamName: 'Design',
			invites: ['grace@ever.co', 'alan@ever.co']
		});
	});

	it('says which invitations are not addresses, and creates nothing', async () => {
		render(<CreateWorkspacePage />);

		type('workspaceCreation.NAME_LABEL', 'Studio');
		type('workspaceCreation.INVITES_LABEL', 'grace@ever.co, not-an-address');
		fireEvent.click(screen.getByRole('button', { name: 'workspaceCreation.CREATE' }));

		expect(await screen.findByText(/workspaceCreation.INVITES_INVALID.*not-an-address/)).toBeTruthy();
		expect(mockMutate).not.toHaveBeenCalled();
	});

	it('asks for a name before anything is created', async () => {
		render(<CreateWorkspacePage />);

		fireEvent.click(screen.getByRole('button', { name: 'workspaceCreation.CREATE' }));

		expect(await screen.findByText('workspaceCreation.NAME_REQUIRED')).toBeTruthy();
		expect(mockMutate).not.toHaveBeenCalled();
	});

	it('leads an unconfirmed address to its confirmation, with the form closed', () => {
		mockUser.current = { isEmailVerified: false };

		render(<CreateWorkspacePage />);

		expect(screen.getByText('workspaceCreation.ADDRESS_UNCONFIRMED_TITLE')).toBeTruthy();
		expect(screen.getByRole('link', { name: 'switchers.CONFIRM_ADDRESS' }).getAttribute('href')).toBe(
			'/settings/personal'
		);
		expect(screen.getByRole('button', { name: 'workspaceCreation.CREATE' })).toHaveProperty('disabled', true);
	});

	it('says when the server allows no new workspace, and when the creation failed', () => {
		Object.assign(mockCreation, {
			isError: true,
			error: { isAxiosError: true, response: { status: 403, data: { code: 'REGISTRATION_CLOSED' } } }
		});
		const { rerender } = render(<CreateWorkspacePage />);
		expect(screen.getByText('workspaceCreation.REGISTRATION_CLOSED_TITLE')).toBeTruthy();

		Object.assign(mockCreation, {
			error: { isAxiosError: true, response: { status: 502, data: { code: 'FAILED' } } }
		});
		rerender(<CreateWorkspacePage />);
		expect(screen.getByText('workspaceCreation.FAILED_TITLE')).toBeTruthy();
	});

	it('keeps the button busy while the workspace is created and opened', () => {
		Object.assign(mockCreation, { isPending: true });

		render(<CreateWorkspacePage />);

		const button = screen.getByRole('button', { name: 'workspaceCreation.CREATING' });
		expect(button).toHaveProperty('disabled', true);
		expect(button.getAttribute('aria-busy')).toBe('true');
	});

	it('names the invitation limit beside the field, and creates nothing', async () => {
		render(<CreateWorkspacePage />);

		type('workspaceCreation.NAME_LABEL', 'Studio');
		const addresses = Array.from({ length: 51 }, (_, index) => `member${index}@ever.co`);
		type('workspaceCreation.INVITES_LABEL', addresses.join('\n'));
		fireEvent.click(screen.getByRole('button', { name: 'workspaceCreation.CREATE' }));

		expect(await screen.findByText('workspaceCreation.INVITES_TOO_MANY {"max":50}')).toBeTruthy();
		expect(mockMutate).not.toHaveBeenCalled();
	});

	it('closes the form once the server says the address is unconfirmed, whatever the session says', () => {
		Object.assign(mockCreation, {
			isError: true,
			error: { isAxiosError: true, response: { status: 403, data: { code: 'ADDRESS_UNCONFIRMED' } } }
		});

		render(<CreateWorkspacePage />);

		expect(screen.getByText('workspaceCreation.ADDRESS_UNCONFIRMED_TITLE')).toBeTruthy();
		expect(screen.getByLabelText(/workspaceCreation.NAME_LABEL/).closest('fieldset')).toHaveProperty(
			'disabled',
			true
		);
		expect(screen.getByRole('button', { name: 'workspaceCreation.CREATE' })).toHaveProperty('disabled', true);
	});

	it('says a workspace created but not opened exists, and offers no retry that would create a second one', () => {
		Object.assign(mockCreation, {
			isError: true,
			error: { isAxiosError: true, response: { status: 502, data: { code: 'CREATED_NOT_OPENED' } } }
		});

		render(<CreateWorkspacePage />);

		expect(screen.getByText('workspaceCreation.CREATED_NOT_OPENED_TITLE')).toBeTruthy();
		expect(screen.queryByText('workspaceCreation.FAILED_TITLE')).toBeNull();
		expect(screen.getByLabelText(/workspaceCreation.NAME_LABEL/).closest('fieldset')).toHaveProperty(
			'disabled',
			true
		);
		expect(screen.getByRole('button', { name: 'workspaceCreation.CREATE' })).toHaveProperty('disabled', true);
	});

	it("leads to the sign-up's checkout where opening another workspace needs a subscription", () => {
		Object.assign(mockCreation, {
			isError: true,
			error: {
				isAxiosError: true,
				response: {
					status: 403,
					data: { code: 'SUBSCRIPTION_REQUIRED', details: { checkoutUrl: 'https://ever.co/checkout' } }
				}
			}
		});

		render(<CreateWorkspacePage />);

		expect(screen.getByText('workspaceCreation.SUBSCRIPTION_REQUIRED_TITLE')).toBeTruthy();
		const choosePlan = screen.getByRole('link', { name: 'workspaceCreation.CHOOSE_PLAN' });
		expect(choosePlan.getAttribute('href')).toBe('https://ever.co/checkout');
		expect(choosePlan.getAttribute('target')).toBe('_blank');
		// Once subscribed, the same form creates it
		expect(screen.getByRole('button', { name: 'workspaceCreation.CREATE' })).toHaveProperty('disabled', false);
	});

	it('says when it cannot tell whether the workspace was created, and offers no retry', () => {
		// No answer from the route (a timeout, the network): the workspace may exist all the same
		Object.assign(mockCreation, {
			isError: true,
			error: { isAxiosError: true, code: 'ECONNABORTED', message: 'timeout of 120000ms exceeded' }
		});

		render(<CreateWorkspacePage />);

		expect(screen.getByText('workspaceCreation.OUTCOME_UNKNOWN_TITLE')).toBeTruthy();
		expect(screen.queryByText('workspaceCreation.FAILED_TITLE')).toBeNull();
		expect(screen.getByRole('button', { name: 'workspaceCreation.CREATE' })).toHaveProperty('disabled', true);
	});

	describe('while a timer runs', () => {
		const store = getDefaultStore();

		beforeEach(() => store.set(timerStatusState, { running: true } as never));
		// The page is still mounted: the reset re-renders it
		afterEach(() => act(() => store.set(timerStatusState, null as never)));

		it('says to stop it first and creates nothing: the new workspace would leave it counting out of sight', async () => {
			render(<CreateWorkspacePage />);

			expect(screen.getByText('workspaceCreation.TIMER_RUNNING_TITLE')).toBeTruthy();
			const create = screen.getByRole('button', { name: 'workspaceCreation.CREATE' });
			expect(create).toHaveProperty('disabled', true);

			// Submitted another way than the button (Enter in a field): the form's own check
			type('workspaceCreation.NAME_LABEL', 'Studio');
			fireEvent.submit(create.closest('form') as HTMLFormElement);
			await act(async () => await new Promise((resolve) => setTimeout(resolve, 0)));
			expect(mockMutate).not.toHaveBeenCalled();
		});

		it('creates once the timer is stopped', async () => {
			render(<CreateWorkspacePage />);
			type('workspaceCreation.NAME_LABEL', 'Studio');

			act(() => store.set(timerStatusState, { running: false } as never));
			fireEvent.click(screen.getByRole('button', { name: 'workspaceCreation.CREATE' }));

			await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1));
		});
	});
});
