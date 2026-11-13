'use client';

import { useCallback, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { useCurrentOrganizationOwner } from '@/core/hooks/bootstrap/use-feature-data';
import { useClientNames } from '@/core/hooks/clients/use-client-names';
import { savedInvoiceOf, savedInvoiceStatusOf } from '@/core/lib/utils/invoice-edit';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import { useInvoiceQuery } from './use-invoices-query';

/** A saved invoice read for its editor, or for the invoice that replaces it, in the zone of its organization. */
export function useSavedInvoice(invoiceId: string | null) {
	const t = useTranslations();
	const organizationRead = useCurrentOrganizationOwner();
	const organization = useAtomValue(currentOrganizationState);
	const clientNames = useClientNames();
	const read = useInvoiceQuery(invoiceId);
	const invoice = read.invoice;
	const timeZone = organization?.timeZone;
	const unnamedProject = t('invoices.new.UNNAMED_PROJECT');

	const saved = useMemo(() => {
		if (!invoice) {
			return null;
		}
		return savedInvoiceOf(invoice, { timeZone, unnamedProject, clientNames });
	}, [clientNames, invoice, timeZone, unnamedProject]);

	const status = savedInvoiceStatusOf({
		hasOrganization: organization !== null,
		hasOrganizationFailed: organizationRead.isError,
		isLoading: read.isLoading,
		isMissing: read.isMissing,
		isError: read.isError,
		hasInvoice: invoice !== null,
		isReadable: saved !== null
	});

	const refetchOrganization = organizationRead.refetch;
	const refetchInvoice = read.refetch;
	const retry = useCallback(() => {
		void refetchOrganization();
		void refetchInvoice();
	}, [refetchInvoice, refetchOrganization]);

	return { status, saved, number: invoice?.invoiceNumber ?? null, retry };
}
