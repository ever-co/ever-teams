import { copyBlockLinkOnceHeld, holdForExport, type DocsPageEdits } from './docs-page-edits';

const LINK = 'https://app.example/docs/page-1?block=b-1';

function editsOf(pending: boolean, held: boolean | Promise<boolean>): DocsPageEdits & { hold: jest.Mock } {
	return { pending: () => pending, hold: jest.fn(() => Promise.resolve(held)) };
}

describe('copyBlockLinkOnceHeld', () => {
	it('writes the link in the click itself when nothing waits to be saved', async () => {
		const write = jest.fn(() => Promise.resolve());
		const edits = editsOf(false, true);

		const copied = copyBlockLinkOnceHeld(LINK, edits, write);
		// Before any await: the browser still counts the click.
		expect(write).toHaveBeenCalledWith(LINK);
		await expect(copied).resolves.toBe('copied');
		expect(edits.hold).not.toHaveBeenCalled();
	});

	it('writes the link only once the page holds the block anchor', async () => {
		let settle: (held: boolean) => void = () => undefined;
		const write = jest.fn(() => Promise.resolve());
		const edits = editsOf(true, new Promise<boolean>((resolve) => (settle = resolve)));

		const copied = copyBlockLinkOnceHeld(LINK, edits, write);
		await Promise.resolve();
		expect(write).not.toHaveBeenCalled();
		settle(true);
		await expect(copied).resolves.toBe('copied');
		expect(write).toHaveBeenCalledWith(LINK);
	});

	it('copies nothing and says so when the save fails (a conflict, a session that stays down)', async () => {
		const write = jest.fn(() => Promise.resolve());

		await expect(copyBlockLinkOnceHeld(LINK, editsOf(true, false), write)).resolves.toBe('unsaved');
		expect(write).not.toHaveBeenCalled();
	});

	it('reports a clipboard the browser refuses', async () => {
		const write = jest.fn(() => Promise.reject(new Error('denied')));

		await expect(copyBlockLinkOnceHeld(LINK, editsOf(false, true), write)).resolves.toBe('copy-failed');
	});
});

describe('holdForExport', () => {
	it('waits for edits still unconfirmed, a reconnecting live session included, and refuses the export when they are not', async () => {
		const edits = editsOf(true, false);

		await expect(holdForExport(edits, false)).resolves.toBe(false);
		expect(edits.hold).toHaveBeenCalledTimes(1);
	});

	it('lets the export go once the pending edits are held', async () => {
		await expect(holdForExport(editsOf(true, true), false)).resolves.toBe(true);
	});

	it('lets the export go at once with nothing pending', async () => {
		const edits = editsOf(false, false);

		await expect(holdForExport(edits, false)).resolves.toBe(true);
		expect(edits.hold).not.toHaveBeenCalled();
	});

	it('refuses the export while the text of a stopped live session is not the autosave draft yet', async () => {
		const edits = editsOf(false, true);

		await expect(holdForExport(edits, true)).resolves.toBe(false);
		expect(edits.hold).not.toHaveBeenCalled();
	});
});
