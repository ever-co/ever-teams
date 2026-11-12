'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoiceService } from '@/core/services/client/api/organizations/invoice.service';
import { queryKeys } from '@/core/query/keys';
import { downloadBlob } from '@/core/lib/utils/dashboard-export';
import type { InvoiceRequest } from '@/core/lib/utils/invoices';

export function useCreateInvoice() {
	const queryClient = useQueryClient();
	const mutation = useMutation({
		mutationFn: (request: InvoiceRequest) => invoiceService.createInvoice(request),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all }),
		// A failed save may have been saved all the same: the client's invoices and the next number are read again,
		// without holding back the error until they answer.
		onError: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
		},
		meta: { handlesOwnError: true }
	});
	return { createInvoice: mutation.mutateAsync, isSaving: mutation.isPending };
}

export interface InvoiceToDownload {
	id: string;
	fileName: string;
}

export function useInvoicePdf() {
	const mutation = useMutation({
		mutationFn: async ({ id, fileName }: InvoiceToDownload) => {
			const pdf = await invoiceService.downloadInvoicePdf(id);
			downloadBlob(pdf, fileName);
		}
	});
	let pendingId: string | null = null;
	if (mutation.isPending) {
		pendingId = mutation.variables?.id ?? null;
	}
	return { downloadPdf: mutation.mutate, pendingId };
}
