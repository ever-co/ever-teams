/** @jest-environment jsdom */

import React from 'react';
import { render, screen } from '@testing-library/react';

type MockMessageProps = { title: string; message: string; action?: React.ReactNode };

const mockInvoice: { current: Record<string, unknown> } = { current: {} };

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }));
jest.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));
jest.mock('jotai', () => ({ ...jest.requireActual('jotai'), useAtomValue: () => false }));
jest.mock('@/core/stores', () => ({ isTrackingEnabledState: {} }));
jest.mock('@/core/components/layouts/default-layout', () => ({
	PageLayout: ({ children }: Readonly<{ children: React.ReactNode }>) => <main>{children}</main>
}));
jest.mock('@/core/components/layouts/app/authenticator', () => ({
	withAuthentication: (component: React.ComponentType) => component
}));
jest.mock('@/core/components/common/input', () => ({ controlRecipe: '' }));
jest.mock('@/core/components/common/segmented-control', () => ({ SegmentedControl: () => null }));
jest.mock('@/core/components/dashboards/kit/dashboard-breadcrumb', () => ({ DashboardBreadcrumb: () => null }));
jest.mock('@/core/components/dashboards/kit/dashboard-layout', () => ({ DashboardToolbar: () => null }));
jest.mock('@/core/components/dashboards/kit/dashboard-states', () => ({ DashboardErrorNotice: () => null }));
jest.mock('@/core/components/dashboards/kit/period-picker', () => ({ PeriodPicker: () => null }));
jest.mock('@/core/components/duplicated-components/_button', () => ({
	Button: ({ children }: Readonly<{ children: React.ReactNode }>) => <button type="button">{children}</button>
}));
jest.mock('@/core/components/icons', () => ({ Invoice: () => null }));
jest.mock('@/core/hooks/bootstrap/use-feature-data', () => ({ useCurrentOrganizationOwner: () => ({}) }));
jest.mock('@/core/hooks/common/use-workspace-week-start', () => ({ useWorkspaceWeekStart: () => 1 }));
jest.mock('@/core/hooks/invoices/use-new-invoice', () => ({
	useNewInvoice: () => mockInvoice.current
}));
jest.mock('../invoice-access-guard', () => ({
	INVOICES_PATH: '/invoices',
	NEW_INVOICE_PATH: '/invoices/new',
	REPLACES_PARAM: 'replaces',
	InvoiceAccessGuard: ({ children }: Readonly<{ children: React.ReactNode }>) => <>{children}</>
}));
jest.mock('./invoice-screen', () => ({ PreparedInvoice: () => <p>prepared invoice</p> }));
jest.mock('./new-invoice-recipes', () => ({ GROUPING_SWITCH: '' }));
jest.mock('./new-invoice-states', () => ({
	InvoiceSheetSkeleton: () => null,
	NewInvoicePageSkeleton: () => null,
	NewInvoiceMessage: ({ title, message, action }: MockMessageProps) => (
		<section aria-label={title}>
			<p>{message}</p>
			{action}
		</section>
	),
	MessageLink: ({ href, children }: Readonly<{ href: string; children: React.ReactNode }>) => (
		<a href={href}>{children}</a>
	)
}));
jest.mock('./replacement-invoice', () => ({ ReplacementInvoiceContent: () => null }));
jest.mock('./save-invoice-dialog', () => ({ SaveInvoiceDialog: () => null }));

import NewInvoicePage from './page-component';

const acme = { id: 'client-acme', name: 'Acme' };

function invoiceWithTime(time: Record<string, unknown>) {
	return {
		client: acme,
		clients: [acme],
		areClientsLoading: false,
		isOrganizationLoading: false,
		haveClientsFailed: false,
		hasOrganizationFailed: false,
		period: { from: new Date(2026, 9, 1), to: new Date(2026, 9, 31) },
		grouping: 'member',
		time: {
			hasProjects: true,
			lines: [],
			unpriced: [],
			isLoading: false,
			isError: false,
			isUpdating: false,
			isAllInvoiced: false,
			refetch: jest.fn(),
			...time
		}
	};
}

describe('a new invoice whose period offers no time to bill', () => {
	it('says the period is already invoiced when every billable hour of it is on an invoice', () => {
		mockInvoice.current = invoiceWithTime({ isAllInvoiced: true });

		render(<NewInvoicePage />);

		const message = screen.getByRole('region', { name: 'invoices.billedTime.ALL_INVOICED_TITLE' });
		expect(message.textContent).toContain('invoices.billedTime.ALL_INVOICED_MESSAGE');
		const link = screen.getByRole('link', { name: 'invoices.edit.BACK_TO_LIST' });
		expect(link.getAttribute('href')).toBe('/invoices');
		expect(screen.queryByRole('region', { name: 'invoices.new.NO_TIME_TITLE' })).toBeNull();
	});

	it('says the period has no billable time when none of it is invoiced', () => {
		mockInvoice.current = invoiceWithTime({ isAllInvoiced: false });

		render(<NewInvoicePage />);

		expect(screen.getByRole('region', { name: 'invoices.new.NO_TIME_TITLE' })).toBeTruthy();
		expect(screen.queryByRole('region', { name: 'invoices.billedTime.ALL_INVOICED_TITLE' })).toBeNull();
	});
});
