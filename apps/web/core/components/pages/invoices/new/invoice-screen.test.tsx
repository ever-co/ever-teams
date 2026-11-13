/** @jest-environment jsdom */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { InvoiceDraftState } from '@/core/hooks/invoices/use-new-invoice';
import type { OverlapNotice as OverlapNoticeState } from '@/core/lib/utils/invoice-billed-time';

type MockNoticeProps = { tone: string; title: React.ReactNode; description?: React.ReactNode };

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) => {
		if (!values) {
			return key;
		}
		return `${key} ${JSON.stringify(values)}`;
	}
}));
jest.mock('@/core/components/common/notice', () => ({
	Notice: (props: MockNoticeProps) => (
		<output data-tone={props.tone}>
			<p>{props.title}</p>
			<p>{props.description}</p>
		</output>
	)
}));
jest.mock('@/core/components/layouts/default-layout', () => ({ PageLayout: () => null }));
jest.mock('@/core/components/dashboards/kit/dashboard-breadcrumb', () => ({ DashboardBreadcrumb: () => null }));
jest.mock('@/core/components/dashboards/kit/dashboard-layout', () => ({ DashboardToolbar: () => null }));
jest.mock('@/core/components/dashboards/kit/dashboard-states', () => ({ DashboardErrorNotice: () => null }));
jest.mock('@/core/components/duplicated-components/_button', () => ({ Button: () => null }));
jest.mock('@/core/components/icons', () => ({ Clock: () => null, Invoice: () => null, Undo: () => null }));
jest.mock('@/core/stores', () => ({ isTrackingEnabledState: {} }));
jest.mock('../invoice-access-guard', () => ({ INVOICES_PATH: '/invoices' }));
jest.mock('./invoice-details', () => ({ InvoiceDetails: () => null }));
jest.mock('./invoice-earlier', () => ({ EarlierInvoices: () => null }));
jest.mock('./invoice-left-out', () => ({ OtherCurrencies: () => null, UnpricedTimeList: () => null }));
jest.mock('./invoice-sheet', () => ({ InvoiceSheet: () => null }));
jest.mock('./new-invoice-states', () => ({ InvoiceSheetSkeleton: () => null }));

import { OverlapNotice } from './invoice-screen';

function invoiceWith(overlapNotice: OverlapNoticeState) {
	const invoice: Partial<InvoiceDraftState> = { client: { id: 'client-acme', name: 'Acme' }, overlapNotice };
	return invoice as InvoiceDraftState;
}

function shownNotice() {
	const notice = screen.getByRole('status');
	const [title, description] = Array.from(notice.querySelectorAll('p')).map((line) => line.textContent);
	return { tone: notice.dataset.tone, title, description };
}

describe('the notice about earlier invoices of the same period', () => {
	it('is a quiet note when every one of them records its time', () => {
		render(<OverlapNotice invoice={invoiceWith({ kind: 'leftOut', count: 2 })} />);

		expect(shownNotice()).toEqual({
			tone: 'info',
			title: 'invoices.billedTime.LEFT_OUT_TITLE',
			description: 'invoices.billedTime.LEFT_OUT_MESSAGE {"count":2,"client":"Acme"}'
		});
	});

	it('stays a warning about the invoices that do not say which hours they bill', () => {
		render(<OverlapNotice invoice={invoiceWith({ kind: 'mayBillTwice', count: 1, isUnrecorded: true })} />);

		expect(shownNotice()).toEqual({
			tone: 'warning',
			title: 'invoices.new.earlier.OVERLAP_TITLE {"count":1,"client":"Acme"}',
			description: 'invoices.billedTime.UNRECORDED_MESSAGE {"count":1}'
		});
	});

	it('stays the warning it was when the API does not record billed time', () => {
		render(<OverlapNotice invoice={invoiceWith({ kind: 'mayBillTwice', count: 2, isUnrecorded: false })} />);

		expect(shownNotice()).toEqual({
			tone: 'warning',
			title: 'invoices.new.earlier.OVERLAP_TITLE {"count":2,"client":"Acme"}',
			description: 'invoices.new.earlier.OVERLAP_MESSAGE'
		});
	});

	it('is not shown without an overlap, nor while the earlier invoices are checked', () => {
		const { container } = render(<OverlapNotice invoice={invoiceWith({ kind: 'none' })} />);

		expect(container.innerHTML).toBe('');
	});
});
