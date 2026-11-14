interface NumberedInvoice {
	invoiceNumber?: number | null;
}

interface ClientOfInvoice {
	toContactId?: string | null;
	toContact?: { name?: string | null } | null;
}

export function invoiceNumberTextOf(invoice: NumberedInvoice): string | null {
	const number = invoice.invoiceNumber;
	if (typeof number !== 'number') {
		return null;
	}
	return String(number);
}

export function invoicePdfFileNameOf(numberText: string | null) {
	if (!numberText) {
		return 'invoice.pdf';
	}
	return `invoice-${numberText}.pdf`;
}

/** The API drops an archived client from the invoice's relation while the invoice keeps the client's id. */
export function invoiceClientNameOf(invoice: ClientOfInvoice, clientNames: ReadonlyMap<string, string>) {
	const relatedName = invoice.toContact?.name?.trim();
	if (relatedName) {
		return relatedName;
	}
	const clientId = invoice.toContactId;
	if (!clientId) {
		return null;
	}
	return clientNames.get(clientId) ?? null;
}
