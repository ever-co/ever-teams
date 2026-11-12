import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const INVOICE_PAGES = resolve(__dirname, '../../core/components/pages/invoices');

/**
 * An invoice states the organisation it is from, is dated in its time zone and takes its payment term. The
 * organisation is loaded by the page through its owner hook: without it a direct visit, or a reload, prepares an
 * invoice from nobody.
 */
const PAGES_THAT_READ_THE_ORGANISATION = ['page-component.tsx', 'new/page-component.tsx'];

describe('invoice pages', () => {
	it.each(PAGES_THAT_READ_THE_ORGANISATION)('%s loads the organisation the invoices are issued by', (page) => {
		const source = readFileSync(resolve(INVOICE_PAGES, page), 'utf8');

		expect(source).toContain('useCurrentOrganizationOwner()');
	});
});
