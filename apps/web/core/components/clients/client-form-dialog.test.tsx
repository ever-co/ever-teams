/** @jest-environment jsdom */

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { TClient } from '@/core/types/schemas';

interface Deferred<T> {
	promise: Promise<T>;
	resolve: (value: T) => void;
	reject: (error: Error) => void;
}

/** An answer of the API the test gives when it chooses to. */
function deferred<T>(): Deferred<T> {
	let resolve: (value: T) => void = () => undefined;
	let reject: (error: Error) => void = () => undefined;
	const promise = new Promise<T>((onResolve, onReject) => {
		resolve = onResolve;
		reject = onReject;
	});
	return { promise, resolve, reject };
}

type MockDialogProps = { open: boolean; children: React.ReactNode };

type MockDialogHeaderProps = { title: string; onClose: () => void };

const mockContactService = { createClient: jest.fn(), updateClient: jest.fn() };
const mockToastSuccess = jest.fn();

// Getter: the mocked module loads before this file's constants are set, and reads the service only when called
jest.mock('@/core/services/client/api/organizations', () => ({
	get organizationContactService() {
		return mockContactService;
	}
}));
jest.mock('@/core/lib/helpers/cookies', () => ({
	getTenantIdCookie: () => 'tenant-1',
	getOrganizationIdCookie: () => 'organization-1'
}));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('sonner', () => ({ toast: { success: (message: string) => mockToastSuccess(message) } }));
// The header's close button and Escape both end in `onClose`; "leave" stands for them
jest.mock('@/core/components/common/app-dialog', () => ({
	APP_DIALOG_BODY: '',
	APP_DIALOG_FOOTER: '',
	AppDialog: (props: MockDialogProps) => {
		if (!props.open) {
			return null;
		}
		return <div role="dialog">{props.children}</div>;
	},
	AppDialogHeader: (props: MockDialogHeaderProps) => (
		<div>
			<h2>{props.title}</h2>
			<button type="button" onClick={props.onClose}>
				leave
			</button>
		</div>
	)
}));

import { ClientFormDialog } from './client-form-dialog';

const acme: TClient = { id: 'client-acme', name: 'Acme' };

/** The Clients page as far as the form goes: one dialog, opened by "New client" and closed by the form. */
function ClientsPageWithForm() {
	const [isFormOpen, setIsFormOpen] = useState(true);
	return (
		<>
			<button type="button" onClick={() => setIsFormOpen(true)}>
				open the form
			</button>
			<ClientFormDialog open={isFormOpen} onClose={() => setIsFormOpen(false)} />
		</>
	);
}

function renderPage() {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return render(
		<QueryClientProvider client={queryClient}>
			<ClientsPageWithForm />
		</QueryClientProvider>
	);
}

function nameField() {
	return screen.getByLabelText<HTMLInputElement>('common.NAME');
}

function typeName(name: string) {
	fireEvent.change(nameField(), { target: { value: name } });
}

/** The person saves; the API has not answered yet. */
async function saveAndWait() {
	fireEvent.click(screen.getByRole('button', { name: 'clients.form.CREATE' }));
	await waitFor(() => expect(mockContactService.createClient).toHaveBeenCalledTimes(1));
}

describe('a client save that ends after its form was left', () => {
	beforeEach(() => {
		mockContactService.createClient.mockReset();
		mockToastSuccess.mockReset();
	});

	it('does not close the form opened meanwhile, nor lose what was typed in it', async () => {
		const creation = deferred<TClient>();
		mockContactService.createClient.mockReturnValue(creation.promise);
		renderPage();
		typeName('Acme');
		await saveAndWait();

		fireEvent.click(screen.getByRole('button', { name: 'leave' }));
		fireEvent.click(screen.getByRole('button', { name: 'open the form' }));
		typeName('Zenith');

		await act(async () => {
			creation.resolve(acme);
			await creation.promise;
		});
		await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith('clients.toasts.CREATED'));

		expect(nameField().value).toBe('Zenith');
	});

	it('closes its own form when the person waited for it', async () => {
		const creation = deferred<TClient>();
		mockContactService.createClient.mockReturnValue(creation.promise);
		renderPage();
		typeName('Acme');
		await saveAndWait();

		await act(async () => {
			creation.resolve(acme);
			await creation.promise;
		});

		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
		expect(mockToastSuccess).toHaveBeenCalledWith('clients.toasts.CREATED');
	});
});

function clientFields() {
	return [
		nameField(),
		screen.getByLabelText<HTMLInputElement>(/common\.EMAIL/),
		screen.getByLabelText<HTMLInputElement>(/clients\.form\.PHONE/),
		screen.getByLabelText<HTMLTextAreaElement>(/common\.NOTES/)
	];
}

describe('the fields of a client while it is being saved', () => {
	beforeEach(() => {
		mockContactService.createClient.mockReset();
		mockToastSuccess.mockReset();
	});

	it('cannot be changed until the API answers: the form closes on what was sent', async () => {
		const creation = deferred<TClient>();
		mockContactService.createClient.mockReturnValue(creation.promise);
		renderPage();
		typeName('Acme');
		await saveAndWait();

		const editableFields = clientFields().filter((field) => !field.readOnly);
		expect(editableFields).toEqual([]);

		await act(async () => {
			creation.resolve(acme);
			await creation.promise;
		});
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
	});

	it('can be changed again when the save failed, to correct them', async () => {
		const creation = deferred<TClient>();
		mockContactService.createClient.mockReturnValue(creation.promise);
		renderPage();
		typeName('Acme');
		await saveAndWait();

		await act(async () => {
			creation.reject(new Error('Network Error'));
			await creation.promise.catch(() => undefined);
		});
		await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('clients.form.SAVE_FAILED'));

		const readOnlyFields = clientFields().filter((field) => field.readOnly);
		expect(readOnlyFields).toEqual([]);
	});
});
