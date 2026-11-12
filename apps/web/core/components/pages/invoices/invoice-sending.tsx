'use client';

import { useCallback, useId } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Input } from '@/core/components/common/input';
import type { InvoiceSendOutcome } from '@/core/hooks/invoices/use-invoice-mutations';
import { FIELD_LABEL } from './new/new-invoice-recipes';

interface InvoiceRecipientFieldProps {
	value: string;
	onChange: (email: string) => void;
	isInvalid: boolean;
}

/** The address an invoice is e-mailed to, the client's own to start with. */
export function InvoiceRecipientField({ value, onChange, isInvalid }: Readonly<InvoiceRecipientFieldProps>) {
	const t = useTranslations();
	const id = useId();
	const errorId = `${id}-error`;
	let describedBy: string | undefined;
	if (isInvalid) {
		describedBy = errorId;
	}
	return (
		<div className="flex flex-col gap-1.5">
			<label htmlFor={id} className={FIELD_LABEL}>
				{t('invoices.send.RECIPIENT')}
			</label>
			<Input
				id={id}
				type="email"
				inputMode="email"
				autoComplete="email"
				value={value}
				aria-invalid={isInvalid || undefined}
				aria-describedby={describedBy}
				onChange={(event) => onChange(event.target.value)}
			/>
			{isInvalid && (
				<p id={errorId} role="alert" className="text-xs text-destructive-ink">
					{t('invoices.send.RECIPIENT_INVALID')}
				</p>
			)}
		</div>
	);
}

/** Says where an invoice went, and when it could not be marked Sent after it went. */
export function useSentInvoiceToast() {
	const t = useTranslations();
	return useCallback(
		(outcome: InvoiceSendOutcome, number: string, email: string) => {
			const title = t('invoices.send.SENT', { number, email });
			if (outcome === 'sentNotMarked') {
				toast.warning(title, { description: t('invoices.send.NOT_MARKED') });
				return;
			}
			toast.success(title);
		},
		[t]
	);
}
