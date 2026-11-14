/** @jest-environment jsdom */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { SavedInvoice } from '@/core/lib/utils/invoice-edit';

type MockMessageProps = { title: string; message: string; action?: React.ReactNode };

const mockRead = {
	status: 'ready',
	saved: null as SavedInvoice | null,
	number: 42 as number | null,
	isRefreshing: false,
	retry: jest.fn()
};

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }));
jest.mock('@/core/hooks/invoices/use-saved-invoice', () => ({ useSavedInvoice: () => mockRead }));
jest.mock('@/core/hooks/invoices/use-new-invoice', () => ({
	useNewInvoice: () => ({ period: null, time: { isUpdating: false } })
}));
jest.mock('@/core/lib/utils/dashboard-period', () => ({ formatPeriod: () => 'October 2026' }));
jest.mock('@/core/components/common/notice', () => ({
	Notice: ({ title }: Readonly<{ title: string }>) => <p>{title}</p>
}));
jest.mock('@/core/components/dashboards/kit/dashboard-layout', () => ({ DashboardToolbar: () => null }));
jest.mock('@/core/components/dashboards/kit/dashboard-states', () => ({ DashboardErrorNotice: () => null }));
jest.mock('../invoice-access-guard', () => ({
	INVOICES_PATH: '/invoices',
	replacementInvoicePathOf: (id: string) => `/invoices/new?replaces=${id}`
}));
jest.mock('./invoice-screen', () => ({
	CancelInvoiceLink: () => null,
	TakeTimeAgainButton: () => null,
	InvoiceScreenFrame: ({ children }: Readonly<{ children: React.ReactNode }>) => <main>{children}</main>,
	RevisedInvoiceBody: ({ notice }: Readonly<{ notice: React.ReactNode }>) => (
		<section aria-label="replacement">{notice}</section>
	)
}));
jest.mock('./new-invoice-states', () => ({
	MessageLink: ({ children }: Readonly<{ children: React.ReactNode }>) => <a href="/invoices">{children}</a>,
	NewInvoiceMessage: ({ title, message, action }: MockMessageProps) => (
		<section>
			<h2>{title}</h2>
			<p>{message}</p>
			{action}
		</section>
	),
	NewInvoicePageSkeleton: () => <p>loading</p>
}));
jest.mock('./save-invoice-dialog', () => ({ SaveInvoiceDialog: () => null }));

import { ReplacementInvoiceContent } from './replacement-invoice';

function readWith(status: SavedInvoice['status'], isRefreshing = false) {
	mockRead.saved = { id: 'invoice-42', number: 42, status } as SavedInvoice;
	mockRead.isRefreshing = isRefreshing;
}

describe('a replacement opened on an invoice', () => {
	it('starts from a void invoice', () => {
		readWith('VOID');

		render(<ReplacementInvoiceContent invoiceId="invoice-42" />);

		expect(screen.getByRole('region', { name: 'replacement' })).toBeTruthy();
		expect(screen.getByText('invoices.replace.NOTICE_TITLE')).toBeTruthy();
	});

	it.each(['FULLY_PAID', 'PARTIALLY_PAID', 'SENT', 'DRAFT'] as const)(
		'is refused on a %s invoice, which nothing would void',
		(status) => {
			readWith(status);

			render(<ReplacementInvoiceContent invoiceId="invoice-42" />);

			expect(screen.getByRole('heading').textContent).toBe('invoices.replace.NOT_VOID_TITLE');
			expect(screen.getByText('invoices.replace.NOT_VOID_MESSAGE')).toBeTruthy();
			expect(screen.queryByRole('region', { name: 'replacement' })).toBeNull();
		}
	);

	it('waits while an invoice kept from an earlier read is read again after its void', () => {
		readWith('FULLY_PAID', true);

		render(<ReplacementInvoiceContent invoiceId="invoice-42" />);

		expect(screen.getByText('loading')).toBeTruthy();
		expect(screen.queryByRole('heading')).toBeNull();
		expect(screen.queryByRole('region', { name: 'replacement' })).toBeNull();
	});
});
