/** @jest-environment jsdom */

// cspell:ignore Contoso Fabrikam Northwind
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import en from '@/locales/en.json';
import { EmbedMembersNotAddedError } from '@/core/services/client/api/embeds/embeds.service';
import { CreateEmbedCredentialDialog } from './create-embed-credential-dialog';

const mockMutate = jest.fn();
const mockRefetchClients = jest.fn();
const mockUseActiveClients = jest.fn();
let mockIsPending = false;
let mockCreateError: unknown = null;

jest.mock('next-intl', () => ({
	useLocale: () => 'en',
	useTranslations: () => (key: string) => key
}));
jest.mock('@/core/hooks/settings/use-embeds', () => ({
	useCreateEmbedCredential: () => ({
		mutate: mockMutate,
		reset: jest.fn(),
		isPending: mockIsPending,
		isError: mockCreateError !== null,
		error: mockCreateError
	})
}));
jest.mock('@/core/services/client/api/embeds/embeds.service', () => ({
	EmbedMembersNotAddedError: class EmbedMembersNotAddedError extends Error {
		constructor(readonly isRevoked = true) {
			super();
		}
	}
}));
jest.mock('@/core/hooks/clients/use-clients-query', () => ({
	useActiveClients: () => mockUseActiveClients()
}));
jest.mock('@/core/components/common/notice', () => ({
	Notice: ({ title }: { title: string }) => <p role="alert">{title}</p>
}));
jest.mock('@/core/components/common/app-dialog', () => ({
	APP_DIALOG_BODY: 'body',
	APP_DIALOG_FOOTER: 'footer',
	AppDialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => {
		if (!open) {
			return null;
		}
		return <div role="dialog">{children}</div>;
	},
	AppDialogHeader: ({ title }: { title: string }) => <h2>{title}</h2>
}));

const CLIENT = 'settings.embeds.CLIENT_LABEL';
const WHOLE_WORKSPACE = 'settings.embeds.CLIENT_WHOLE_WORKSPACE';
const ADD_MEMBERS = 'settings.embeds.ADD_MEMBERS_LABEL';
const CLIENTS = [
	{ id: 'contact-fabrikam', name: 'Fabrikam Outdoor' },
	{ id: 'contact-contoso', name: 'Contoso Coffee' }
];

function clientsRead(overrides: Record<string, unknown> = {}) {
	return { clients: CLIENTS, isLoading: false, isError: false, refetch: mockRefetchClients, ...overrides };
}

function dialogOf(canLimitToClient: boolean, canAllowAddMembers = false) {
	return (
		<CreateEmbedCredentialDialog
			open
			canLimitToClient={canLimitToClient}
			canAllowAddMembers={canAllowAddMembers}
			onClose={jest.fn()}
		/>
	);
}

function renderDialog(canLimitToClient: boolean, canAllowAddMembers = false) {
	return render(dialogOf(canLimitToClient, canAllowAddMembers));
}

function clientField() {
	return screen.getByRole('combobox', { name: CLIENT });
}

function addMembersBox() {
	return screen.getByRole('checkbox', { name: ADD_MEMBERS });
}

function isTicked(box: HTMLElement): boolean {
	return box.getAttribute('aria-checked') === 'true';
}

function isAfter(element: HTMLElement, earlier: HTMLElement): boolean {
	const position = earlier.compareDocumentPosition(element);
	return (position & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
}

function createWithName(name: string) {
	fireEvent.change(screen.getByLabelText('settings.embeds.NAME_LABEL'), { target: { value: name } });
	fireEvent.click(screen.getByRole('button', { name: 'settings.embeds.CREATE' }));
}

async function pickClient(name: string) {
	fireEvent.click(clientField());
	const option = await screen.findByRole('option', { name });
	// Base UI picks an option where the pointer is released, as a click in a browser does
	fireEvent.pointerDown(option);
	fireEvent.pointerUp(option);
	fireEvent.click(option);
	await waitFor(() => expect(clientField().textContent).toContain(name));
}

function noteOfClientField() {
	const noteId = clientField().getAttribute('aria-describedby') ?? '';
	return document.getElementById(noteId)?.textContent;
}

beforeEach(() => {
	jest.clearAllMocks();
	mockIsPending = false;
	mockCreateError = null;
	mockUseActiveClients.mockReturnValue(clientsRead());
});

describe('CreateEmbedCredentialDialog', () => {
	it('offers no client with an API that cannot limit a credential to one, and asks for the whole workspace', () => {
		renderDialog(false);

		expect(screen.queryByRole('combobox', { name: CLIENT })).toBeNull();
		expect(mockUseActiveClients).not.toHaveBeenCalled();
		createWithName('Northwind customer portal');
		expect(mockMutate).toHaveBeenCalledWith(
			{ name: 'Northwind customer portal', organizationContactId: null },
			expect.anything()
		);
	});

	it('offers the active clients after the whole workspace, and limits the credential to the one chosen', async () => {
		renderDialog(true);

		expect(en.settings.embeds.CLIENT_LABEL).toBe('Client');
		expect(clientField().textContent).toContain(WHOLE_WORKSPACE);
		expect(noteOfClientField()).toBe('settings.embeds.CLIENT_HINT');
		fireEvent.click(clientField());
		const options = await screen.findAllByRole('option');
		expect(options.map((option) => option.textContent)).toEqual([
			WHOLE_WORKSPACE,
			'Fabrikam Outdoor',
			'Contoso Coffee'
		]);
		fireEvent.keyDown(options[0], { key: 'Escape' });

		await pickClient('Fabrikam Outdoor');
		createWithName('Fabrikam client portal');

		expect(mockMutate).toHaveBeenCalledWith(
			{ name: 'Fabrikam client portal', organizationContactId: 'contact-fabrikam' },
			expect.anything()
		);
	});

	it('goes back to the whole workspace', async () => {
		renderDialog(true);

		await pickClient('Fabrikam Outdoor');
		await pickClient(WHOLE_WORKSPACE);
		createWithName('Northwind customer portal');

		expect(mockMutate).toHaveBeenCalledWith(
			{ name: 'Northwind customer portal', organizationContactId: null },
			expect.anything()
		);
	});

	it('says the clients are loading, and creates the credential for the whole workspace meanwhile', () => {
		mockUseActiveClients.mockReturnValue(clientsRead({ clients: [], isLoading: true }));
		renderDialog(true);

		expect(clientField().getAttribute('aria-busy')).toBe('true');
		expect(clientField().hasAttribute('disabled')).toBe(false);
		expect(clientField().textContent).toContain(WHOLE_WORKSPACE);
		expect(noteOfClientField()).toBe('settings.embeds.CLIENT_LOADING');
		createWithName('Northwind customer portal');
		expect(mockMutate).toHaveBeenCalledWith(
			{ name: 'Northwind customer portal', organizationContactId: null },
			expect.anything()
		);
	});

	it('says the workspace has no clients yet, and keeps the whole workspace', () => {
		mockUseActiveClients.mockReturnValue(clientsRead({ clients: [] }));
		renderDialog(true);

		expect(clientField().hasAttribute('disabled')).toBe(true);
		expect(clientField().textContent).toContain(WHOLE_WORKSPACE);
		expect(noteOfClientField()).toBe('settings.embeds.CLIENT_EMPTY');
	});

	it('says the clients could not be loaded, offers a retry, and still creates the credential', () => {
		mockUseActiveClients.mockReturnValue(clientsRead({ clients: [], isError: true }));
		renderDialog(true);

		expect(noteOfClientField()).toBe('settings.embeds.CLIENT_FAILED');
		const note = document.getElementById(clientField().getAttribute('aria-describedby') ?? '');
		fireEvent.click(
			within(note?.parentElement ?? document.body).getByRole('button', { name: 'settings.embeds.RETRY' })
		);
		expect(mockRefetchClients).toHaveBeenCalledTimes(1);
		createWithName('Northwind customer portal');
		expect(mockMutate).toHaveBeenCalledWith(
			{ name: 'Northwind customer portal', organizationContactId: null },
			expect.anything()
		);
	});

	it('keeps a chosen client in sight and sends it when the config read again says clients cannot be limited', async () => {
		const { rerender } = renderDialog(true);
		await pickClient('Fabrikam Outdoor');

		rerender(dialogOf(false));

		expect(clientField().textContent).toContain('Fabrikam Outdoor');
		createWithName('Fabrikam client portal');
		expect(mockMutate).toHaveBeenCalledWith(
			{ name: 'Fabrikam client portal', organizationContactId: 'contact-fabrikam' },
			expect.anything()
		);
	});

	it('keeps a chosen client that leaves the active ones, in sight, until it is changed back', async () => {
		const { rerender } = renderDialog(true);
		await pickClient('Fabrikam Outdoor');

		mockUseActiveClients.mockReturnValue(clientsRead({ clients: [] }));
		rerender(dialogOf(true));

		expect(clientField().hasAttribute('disabled')).toBe(false);
		expect(clientField().textContent).toContain('Fabrikam Outdoor');
		expect(noteOfClientField()).toBe('settings.embeds.CLIENT_EMPTY');
		await pickClient(WHOLE_WORKSPACE);
		createWithName('Northwind customer portal');
		expect(mockMutate).toHaveBeenCalledWith(
			{ name: 'Northwind customer portal', organizationContactId: null },
			expect.anything()
		);
	});

	it('locks the client while the credential is being created, as the name', () => {
		mockIsPending = true;
		renderDialog(true);

		expect(screen.getByLabelText('settings.embeds.NAME_LABEL').hasAttribute('disabled')).toBe(true);
		expect(clientField().hasAttribute('disabled')).toBe(true);
	});
});

describe('CreateEmbedCredentialDialog, the option to add the people a credential signs in', () => {
	beforeAll(() => {
		// jsdom has no PointerEvent, which Base UI's checkbox dispatches when it is clicked
		if (typeof window.PointerEvent === 'undefined') {
			window.PointerEvent = MouseEvent as unknown as typeof PointerEvent;
		}
	});

	it('is not offered with an API that cannot let a credential add members', () => {
		renderDialog(true, false);

		expect(screen.queryByRole('checkbox', { name: ADD_MEMBERS })).toBeNull();
		expect(screen.queryByText('settings.embeds.ADD_MEMBERS_HINT')).toBeNull();
	});

	it('is offered off, under the client, with what it does, and asks for nothing more while off', () => {
		renderDialog(true, true);

		expect(en.settings.embeds.ADD_MEMBERS_LABEL).toBe('Add the people signed in with this credential');
		expect(isTicked(addMembersBox())).toBe(false);
		expect(isAfter(addMembersBox(), clientField())).toBe(true);
		const hintId = addMembersBox().getAttribute('aria-describedby') ?? '';
		expect(document.getElementById(hintId)?.textContent).toBe('settings.embeds.ADD_MEMBERS_HINT');
		createWithName('Northwind customer portal');
		const [input] = mockMutate.mock.calls[0];
		expect(input).toEqual({ name: 'Northwind customer portal', organizationContactId: null });
		expect(input).not.toHaveProperty('canAddMembers');
	});

	it('sits under the name when no client is offered, and asks for a credential that adds members once ticked', () => {
		renderDialog(false, true);

		expect(isAfter(addMembersBox(), screen.getByLabelText('settings.embeds.NAME_LABEL'))).toBe(true);
		fireEvent.click(addMembersBox());
		expect(isTicked(addMembersBox())).toBe(true);
		createWithName('Northwind customer portal');
		expect(mockMutate).toHaveBeenCalledWith(
			{ name: 'Northwind customer portal', organizationContactId: null, canAddMembers: true },
			expect.anything()
		);
	});

	it('sends the members option beside the client chosen', async () => {
		renderDialog(true, true);

		await pickClient('Fabrikam Outdoor');
		fireEvent.click(addMembersBox());
		createWithName('Fabrikam client portal');
		expect(mockMutate).toHaveBeenCalledWith(
			{ name: 'Fabrikam client portal', organizationContactId: 'contact-fabrikam', canAddMembers: true },
			expect.anything()
		);
	});

	it('asks for nothing more once ticked off again', () => {
		renderDialog(false, true);

		fireEvent.click(addMembersBox());
		fireEvent.click(addMembersBox());
		createWithName('Northwind customer portal');
		expect(mockMutate.mock.calls[0][0]).not.toHaveProperty('canAddMembers');
	});

	it('stays ticked and is sent when the config read again says a credential cannot add members', () => {
		const { rerender } = renderDialog(false, true);
		fireEvent.click(addMembersBox());

		rerender(dialogOf(false, false));

		expect(isTicked(addMembersBox())).toBe(true);
		createWithName('Northwind customer portal');
		expect(mockMutate).toHaveBeenCalledWith(
			{ name: 'Northwind customer portal', organizationContactId: null, canAddMembers: true },
			expect.anything()
		);
	});

	it('is locked while the credential is being created', () => {
		mockIsPending = true;
		renderDialog(false, true);

		expect(addMembersBox().hasAttribute('data-disabled')).toBe(true);
	});

	it('says the server could not let the credential add people, apart from any other failure', () => {
		mockCreateError = new EmbedMembersNotAddedError();
		const { unmount } = renderDialog(false, true);

		expect(screen.getByRole('alert').textContent).toBe('settings.embeds.ADD_MEMBERS_FAILED');
		unmount();

		mockCreateError = new Error('offline');
		renderDialog(false, true);
		expect(screen.getByRole('alert').textContent).toBe('settings.embeds.CREATE_FAILED');
	});

	it('never says the credential was revoked when its revocation failed', () => {
		mockCreateError = new EmbedMembersNotAddedError(false);
		renderDialog(false, true);

		expect(en.settings.embeds.ADD_MEMBERS_NOT_REVOKED).not.toContain('was revoked');
		expect(screen.getByRole('alert').textContent).toBe('settings.embeds.ADD_MEMBERS_NOT_REVOKED');
	});
});
