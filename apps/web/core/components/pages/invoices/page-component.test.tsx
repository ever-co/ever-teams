/** @jest-environment jsdom */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { InvoicesScope } from '@/core/services/client/api/organizations/invoice.service';
import type { InvoiceAction } from '@/core/lib/utils/invoice-actions';
import type { InvoiceActionTarget } from './invoice-action-dialogs';

interface MockDialogProps {
	open: boolean;
	target: InvoiceActionTarget | null;
	scope: InvoicesScope | null;
}

type MockLedgerProps = {
	invoices: InvoiceActionTarget['invoice'][];
	onAction: (target: InvoiceActionTarget, action: InvoiceAction) => void;
};

const mockList: { current: Record<string, unknown> } = { current: {} };
const mockSendDialog: { props: MockDialogProps | null } = { props: null };
const mockChangeStatus = jest.fn();

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('jotai', () => ({ ...jest.requireActual('jotai'), useAtomValue: () => null }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('@/core/stores', () => ({ activeTeamState: {}, isTrackingEnabledState: {} }));
jest.mock('@/core/stores/user/user-organizations', () => ({ currentOrganizationState: {} }));
jest.mock('@/core/components/layouts/default-layout', () => ({
	PageLayout: ({ children }: Readonly<{ children: React.ReactNode }>) => <div>{children}</div>
}));
jest.mock('@/core/components/layouts/app/authenticator', () => ({
	withAuthentication: (component: React.ComponentType) => component
}));
jest.mock('@/core/components/dashboards/kit/dashboard-breadcrumb', () => ({ DashboardBreadcrumb: () => null }));
jest.mock('@/core/components/duplicated-components/_button', () => ({ Button: () => null }));
jest.mock('@/core/components/icons', () => ({ Invoice: () => null }));
jest.mock('@/core/hooks/bootstrap/use-feature-data', () => ({ useCurrentOrganizationOwner: () => ({}) }));
jest.mock('@/core/hooks/clients/use-client-names', () => ({ useClientNames: () => new Map() }));
jest.mock('@/core/hooks/invoices/use-invoice-access', () => ({
	useInvoiceAccess: () => ({ canView: true, canEdit: true, canCreate: true })
}));
jest.mock('@/core/hooks/invoices/use-invoice-mutations', () => ({
	useChangeInvoiceStatus: () => ({ changeStatus: mockChangeStatus, changingId: null }),
	useInvoicePdf: () => ({ downloadPdf: jest.fn(), pendingId: null })
}));
jest.mock('@/core/hooks/invoices/use-invoices-query', () => ({ useInvoicesQuery: () => mockList.current }));
jest.mock('./invoice-access-guard', () => ({
	INVOICES_PATH: '/invoices',
	InvoiceAccessGuard: ({ children }: Readonly<{ children: React.ReactNode }>) => <>{children}</>
}));
jest.mock('./invoice-action-dialogs', () => ({
	SendInvoiceDialog: (props: MockDialogProps) => {
		mockSendDialog.props = props;
		return null;
	},
	VoidInvoiceDialog: () => null,
	DeleteInvoiceDialog: () => null
}));
jest.mock('./invoices-ledger', () => ({
	InvoicesLedger: ({ invoices, onAction }: MockLedgerProps) => {
		const target = { invoice: invoices[0], numberText: '42', clientName: 'Acme' };
		return (
			<>
				<button type="button" onClick={() => onAction(target, 'send')}>
					send 42
				</button>
				<button type="button" onClick={() => onAction(target, 'markPaid')}>
					mark 42 paid
				</button>
			</>
		);
	}
}));
jest.mock('./invoices-states', () => ({
	InvoicesEmptyState: () => null,
	InvoicesErrorState: () => null,
	InvoicesLedgerSkeleton: () => null,
	InvoicesPageSkeleton: () => null,
	InvoicesToolbar: () => null
}));

import InvoicesPage from './page-component';

const WORKSPACE_A: InvoicesScope = { organizationId: 'organization-1', tenantId: 'tenant-1' };
const WORKSPACE_B: InvoicesScope = { organizationId: 'organization-2', tenantId: 'tenant-1' };

function listIn(scope: InvoicesScope) {
	return {
		invoices: [{ id: 'inv-42', invoiceNumber: 42, status: 'DRAFT', totalValue: 1080 }],
		scope,
		total: 1,
		isLoading: false,
		isError: false,
		hasMore: false,
		isLoadingMore: false,
		loadMore: jest.fn(),
		refetch: jest.fn()
	};
}

beforeEach(() => {
	mockSendDialog.props = null;
	mockChangeStatus.mockReset();
	mockChangeStatus.mockResolvedValue(undefined);
});

describe('the workspace an action on a listed invoice is made in', () => {
	it('stays the one the invoice was read in while its dialog is open, though the list moves to another', () => {
		mockList.current = listIn(WORKSPACE_A);
		const { rerender } = render(<InvoicesPage />);
		fireEvent.click(screen.getByRole('button', { name: 'send 42' }));

		// Another tab switched the workspace, and this page read its cookies again on its next render
		mockList.current = listIn(WORKSPACE_B);
		rerender(<InvoicesPage />);

		expect(mockSendDialog.props?.open).toBe(true);
		expect(mockSendDialog.props?.scope).toEqual(WORKSPACE_A);
	});

	it('is the list’s when an invoice is marked paid from its menu', async () => {
		mockList.current = listIn(WORKSPACE_A);
		render(<InvoicesPage />);

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'mark 42 paid' }));
		});

		expect(mockChangeStatus).toHaveBeenCalledWith(
			expect.objectContaining({ invoiceId: 'inv-42', scope: WORKSPACE_A })
		);
	});
});
