/** @jest-environment jsdom */

// cspell:ignore Contoso Fabrikam Northwind
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import en from '@/locales/en.json';
import { CreateEmbedCredentialDialog } from './create-embed-credential-dialog';

const mockMutate = jest.fn();
const mockRefetchClients = jest.fn();
const mockUseActiveClients = jest.fn();
let mockIsPending = false;

jest.mock('next-intl', () => ({
	useLocale: () => 'en',
	useTranslations: () => (key: string) => key
}));
jest.mock('@/core/hooks/settings/use-embeds', () => ({
	useCreateEmbedCredential: () => ({ mutate: mockMutate, reset: jest.fn(), isPending: mockIsPending, isError: false })
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
const CLIENTS = [
	{ id: 'contact-fabrikam', name: 'Fabrikam Outdoor' },
	{ id: 'contact-contoso', name: 'Contoso Coffee' }
];

function clientsRead(overrides: Record<string, unknown> = {}) {
	return { clients: CLIENTS, isLoading: false, isError: false, refetch: mockRefetchClients, ...overrides };
}

function renderDialog(canLimitToClient: boolean) {
	render(<CreateEmbedCredentialDialog open canLimitToClient={canLimitToClient} onClose={jest.fn()} />);
}

function clientField() {
	return screen.getByRole('combobox', { name: CLIENT });
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

	it('locks the client while the credential is being created, as the name', () => {
		mockIsPending = true;
		renderDialog(true);

		expect(screen.getByLabelText('settings.embeds.NAME_LABEL').hasAttribute('disabled')).toBe(true);
		expect(clientField().hasAttribute('disabled')).toBe(true);
	});
});
