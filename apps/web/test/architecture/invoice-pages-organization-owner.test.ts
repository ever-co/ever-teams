import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const WEB_ROOT = resolve(__dirname, '../..');

/**
 * An invoice states the organisation it is from, is dated in its time zone and takes its payment term. The
 * organisation is loaded through its owner hook, by the list page and by the hook that prepares a new invoice:
 * without it a direct visit, or a reload, prepares an invoice from nobody.
 */
const FILES_THAT_READ_THE_ORGANISATION = [
	'core/components/pages/invoices/page-component.tsx',
	'core/hooks/invoices/use-new-invoice.ts'
];

describe('invoice pages', () => {
	it.each(FILES_THAT_READ_THE_ORGANISATION)('%s loads the organisation the invoices are issued by', (file) => {
		const source = readFileSync(resolve(WEB_ROOT, file), 'utf8');

		expect(source).toContain('useCurrentOrganizationOwner()');
	});
});
