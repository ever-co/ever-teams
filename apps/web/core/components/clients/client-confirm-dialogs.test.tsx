/** @jest-environment jsdom */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { TClient } from '@/core/types/schemas';

interface Deferred {
	promise: Promise<void>;
	resolve: () => void;
}

/** An answer of the API the test gives when it chooses to. */
function deferred(): Deferred {
	let resolve: () => void = () => undefined;
	const promise = new Promise<void>((onResolve) => {
		resolve = onResolve;
	});
	return { promise, resolve };
}

type MockConfirmDialogProps = {
	open: boolean;
	title: string;
	confirmLabel: string;
	isPending: boolean;
	onClose: () => void;
	onConfirm: () => void;
};

const mockContactService = { archiveClient: jest.fn(), restoreClient: jest.fn() };

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
jest.mock('sonner', () => ({ toast: { success: jest.fn() } }));
jest.mock('@/core/components/icons', () => ({
	Archive: () => null,
	Building: () => null,
	Folder: () => null,
	RotateLeft: () => null
}));
// The header's close button and Escape both end in `onClose`; "leave" stands for them
jest.mock('@/core/components/projects/dialogs/project-confirm-dialog', () => ({
	ProjectConfirmDialog: (props: MockConfirmDialogProps) => {
		if (!props.open) {
			return null;
		}
		return (
			<div role="dialog" aria-label={props.title}>
				<button type="button" onClick={props.onClose}>
					leave
				</button>
				<button type="button" onClick={props.onConfirm} disabled={props.isPending}>
					{props.confirmLabel}
				</button>
			</div>
		);
	}
}));

import { ArchiveClientDialog, RestoreClientDialog } from './client-confirm-dialogs';

const acme: TClient = { id: 'client-acme', name: 'Acme' };

function renderInApp(dialog: React.ReactElement) {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return render(<QueryClientProvider client={queryClient}>{dialog}</QueryClientProvider>);
}

/** The person confirms; the API has not answered yet. */
async function confirmAndWait(confirmLabel: string) {
	const confirmButton = screen.getByRole<HTMLButtonElement>('button', { name: confirmLabel });
	fireEvent.click(confirmButton);
	await waitFor(() => expect(confirmButton.disabled).toBe(true));
}

describe('leaving a client confirmation while its request is running', () => {
	beforeEach(() => {
		mockContactService.archiveClient.mockReset();
		mockContactService.restoreClient.mockReset();
	});

	it('keeps the archive dialog until the API answers, then closes it once', async () => {
		const archiving = deferred();
		mockContactService.archiveClient.mockReturnValue(archiving.promise);
		const onClose = jest.fn();
		renderInApp(<ArchiveClientDialog open client={acme} onClose={onClose} />);
		await confirmAndWait('clients.archive.CONFIRM');

		fireEvent.click(screen.getByRole('button', { name: 'leave' }));

		expect(onClose).not.toHaveBeenCalled();

		archiving.resolve();

		await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
		expect(mockContactService.archiveClient).toHaveBeenCalledWith('client-acme');
	});

	it('keeps the restore dialog until the API answers, then closes it once', async () => {
		const restoring = deferred();
		mockContactService.restoreClient.mockReturnValue(restoring.promise);
		const onClose = jest.fn();
		renderInApp(<RestoreClientDialog open client={acme} onClose={onClose} />);
		await confirmAndWait('clients.restore.CONFIRM');

		fireEvent.click(screen.getByRole('button', { name: 'leave' }));

		expect(onClose).not.toHaveBeenCalled();

		restoring.resolve();

		await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
	});

	it('still lets the person leave before confirming', () => {
		const onClose = jest.fn();
		renderInApp(<ArchiveClientDialog open client={acme} onClose={onClose} />);

		fireEvent.click(screen.getByRole('button', { name: 'leave' }));

		expect(onClose).toHaveBeenCalledTimes(1);
		expect(mockContactService.archiveClient).not.toHaveBeenCalled();
	});
});
