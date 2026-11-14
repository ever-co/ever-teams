'use client';

import { useAtomValue } from 'jotai';
import { invoiceDueTermOf } from '@/core/lib/utils/invoices';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';

/**
 * How a client's payment terms read: due on receipt, its own number of days, or the workspace's terms. The
 * workspace's days are told only once the organization is read, so no default is claimed before.
 */
export type ClientTermsReading =
	| { kind: 'receipt' }
	| { kind: 'own'; days: number }
	| { kind: 'workspace'; days: number | null };

export function useClientTerms(paymentTermsDays: number | null | undefined): ClientTermsReading {
	const organization = useAtomValue(currentOrganizationState);
	const term = invoiceDueTermOf(paymentTermsDays, organization?.daysUntilDue);
	const isClientTerm = term.source === 'client';
	if (isClientTerm && term.days === 0) {
		return { kind: 'receipt' };
	}
	if (isClientTerm) {
		return { kind: 'own', days: term.days };
	}
	if (!organization) {
		return { kind: 'workspace', days: null };
	}
	return { kind: 'workspace', days: term.days };
}
