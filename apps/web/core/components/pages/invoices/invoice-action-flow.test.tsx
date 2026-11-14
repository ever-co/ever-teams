/** @jest-environment jsdom */

import { act, renderHook } from '@testing-library/react';
import { toast } from 'sonner';
import type { InvoiceActionTarget } from './invoice-action-dialogs';

const mockChangeStatus = jest.fn();

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('@/core/hooks/invoices/use-invoice-mutations', () => ({
	useChangeInvoiceStatus: () => ({ changeStatus: mockChangeStatus, changingIds: new Set() })
}));
jest.mock('./invoice-action-dialogs', () => ({
	SendInvoiceDialog: () => null,
	VoidInvoiceDialog: () => null,
	VoidAndReplaceDialog: () => null,
	DeleteInvoiceDialog: () => null
}));

import { useInvoiceActionFlow } from './invoice-action-flow';

const WORKSPACE = { organizationId: 'organization-1', tenantId: 'tenant-1' };

const target = {
	invoice: { id: 'inv-42', invoiceNumber: 42, status: 'SENT', totalValue: 1080 },
	numberText: '42',
	clientName: 'Acme'
} as unknown as InvoiceActionTarget;

describe('marking an invoice paid or unpaid from its actions', () => {
	beforeEach(() => {
		mockChangeStatus.mockReset();
		mockChangeStatus.mockResolvedValue({ status: 'FULLY_PAID' });
	});

	it('asks for the payment action in the invoice’s workspace, never with the shown copy of its total', async () => {
		const { result } = renderHook(() => useInvoiceActionFlow(WORKSPACE));

		await act(async () => {
			result.current.takeAction(target, 'markPaid');
		});

		expect(mockChangeStatus).toHaveBeenCalledWith({ invoiceId: 'inv-42', payment: 'markPaid', scope: WORKSPACE });
		expect(mockChangeStatus.mock.calls[0][0]).not.toHaveProperty('change');
		expect(toast.success).toHaveBeenCalledWith('invoices.actions.MARKED_PAID');
		expect(result.current.isDialogOpen).toBe(false);
	});

	it('asks for the unpaid action the same way', async () => {
		const { result } = renderHook(() => useInvoiceActionFlow(WORKSPACE));

		await act(async () => {
			result.current.takeAction(target, 'markUnpaid');
		});

		expect(mockChangeStatus).toHaveBeenCalledWith({ invoiceId: 'inv-42', payment: 'markUnpaid', scope: WORKSPACE });
	});
});
