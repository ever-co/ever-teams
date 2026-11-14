/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

const mockOrganizationRead = { isError: false, refetch: jest.fn() };

jest.mock('next/navigation', () => ({
	useParams: () => ({ id: 'invoice-9' }),
	useRouter: () => ({ push: jest.fn() })
}));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('jotai', () => ({ ...jest.requireActual('jotai'), useAtomValue: () => null }));
jest.mock('@/core/components/common/empty-state', () => ({
	AnimatedEmptyState: ({
		title,
		actionLabel,
		onAction
	}: {
		title: string;
		actionLabel?: string;
		onAction?: () => void;
	}) => (
		<div>
			<p>{title}</p>
			<button type="button" onClick={onAction}>
				{actionLabel}
			</button>
		</div>
	)
}));
jest.mock('@/core/components/dashboards/kit/dashboard-breadcrumb', () => ({ DashboardBreadcrumb: () => null }));
jest.mock('@/core/components/icons', () => ({ Invoice: () => null }));
jest.mock('@/core/components/layouts/default-layout', () => ({
	PageLayout: ({ children }: { children?: React.ReactNode }) => <main>{children}</main>
}));
jest.mock('@/core/hooks/bootstrap/use-feature-data', () => ({
	useCurrentOrganizationOwner: () => mockOrganizationRead
}));
jest.mock('@/core/hooks/clients/use-client-names', () => ({ useClientNames: () => new Map() }));
jest.mock('@/core/hooks/invoices/use-invoice-access', () => ({
	useInvoiceAccess: () => ({ canEdit: false, canCreate: false })
}));
jest.mock('@/core/hooks/invoices/use-invoice-clock', () => ({
	useInvoiceClock: () => ({ todayKey: '2026-11-13', timeZone: null })
}));
jest.mock('@/core/hooks/invoices/use-invoice-mutations', () => ({
	useInvoicePdf: () => ({ downloadPdf: jest.fn(), pendingId: null })
}));
jest.mock('@/core/hooks/invoices/use-invoices-query', () => ({
	useInvoiceQuery: () => ({
		invoice: { id: 'invoice-9', invoiceNumber: 9 },
		scope: { organizationId: 'org-1', tenantId: 'tenant-1' },
		isMissing: false,
		isError: false,
		refetch: jest.fn()
	})
}));
jest.mock('@/core/lib/utils/invoice-edit', () => ({ isInvoiceOfWorkspace: () => true }));
jest.mock('../invoice-action-flow', () => ({
	InvoiceActionDialogs: () => null,
	useInvoiceActionFlow: () => ({ changingIds: new Set(), takeAction: jest.fn() })
}));
jest.mock('../invoice-access-guard', () => ({
	InvoiceAccessGuard: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
	INVOICES_PATH: '/invoices',
	replacementInvoicePathOf: () => '/invoices/new'
}));
jest.mock('./invoice-detail-header', () => ({ InvoiceDetailHeader: () => <p>document header</p> }));
jest.mock('./invoice-detail-paper', () => ({ InvoiceDetailPaper: () => <p>document</p> }));
jest.mock('./invoice-detail-skeleton', () => ({
	InvoiceDetailBodySkeleton: () => null,
	InvoiceDetailHeaderSkeleton: () => null,
	InvoiceDetailPageSkeleton: () => null
}));

import { InvoiceDetailPageComponent } from './page-component';

describe('the invoice page', () => {
	it('offers to read the organization again instead of showing the document without its sender and zone', () => {
		mockOrganizationRead.isError = true;

		render(<InvoiceDetailPageComponent />);

		expect(screen.queryByText('document')).toBeNull();
		fireEvent.click(screen.getByText('pages.unauthorized.TRY_AGAIN'));
		expect(mockOrganizationRead.refetch).toHaveBeenCalledTimes(1);
	});
});
