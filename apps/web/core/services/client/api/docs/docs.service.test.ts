import qs from 'qs';
import { DOCS_LIST_PAGE_SIZE, DOCS_TREE_MAX_PAGES, EDocumentKind, EDocumentVisibility, type IDocumentPage } from '@/core/types/interfaces/common/docs';
import { docsService } from './docs.service';

function page(id: string): IDocumentPage {
	return {
		id,
		kind: EDocumentKind.PAGE,
		index: 0,
		name: id,
		visibility: EDocumentVisibility.ORGANIZATION,
		createdAt: '2026-11-10T00:00:00.000Z',
		updatedAt: '2026-11-10T00:00:00.000Z'
	};
}

/** The pages `first`…`last`, as one answer of the platform's list. */
function rows(first: number, last: number): IDocumentPage[] {
	return Array.from({ length: last - first + 1 }, (_, at) => page(`p${first + at}`));
}

/** What a list request asked for, read back from its URL. */
function asked(url: string): { take: number; skip: number } {
	const query = qs.parse(url.split('?')[1] ?? '');
	return { take: Number(query.take), skip: Number(query.skip) };
}

/**
 * The platform refuses a list page of more than 100 rows (400 "take must not be greater than 100") and, beside `take`,
 * reads `skip` as a page number counted from 1. The tree asked for 200 rows a page and sent a row offset: it never
 * loaded, and with a valid page size it would have lost every page after the first hundred.
 */
describe('docsService.listAll', () => {
	afterEach(() => jest.restoreAllMocks());

	it('never asks for more rows a page than the platform serves', () => {
		expect(DOCS_LIST_PAGE_SIZE).toBeLessThanOrEqual(100);
	});

	it('reads one page when the answer is shorter than a page', async () => {
		const get = jest.spyOn(docsService, 'get').mockResolvedValue({ data: { items: rows(1, 3), total: 3 } } as never);

		const items = await docsService.listAll({ kind: [EDocumentKind.PAGE] });

		expect(items.map((item) => item.id)).toEqual(['p1', 'p2', 'p3']);
		expect(get).toHaveBeenCalledTimes(1);
		expect(asked(String(get.mock.calls[0][0]))).toEqual({ take: DOCS_LIST_PAGE_SIZE, skip: 1 });
	});

	it('asks for the pages by number, 1, 2, 3, until every row is read', async () => {
		const total = DOCS_LIST_PAGE_SIZE * 2 + 5;
		const get = jest.spyOn(docsService, 'get').mockImplementation((async (url: string) => {
			const { take, skip } = asked(url);
			const first = take * (skip - 1) + 1;
			return { data: { items: first > total ? [] : rows(first, Math.min(first + take - 1, total)), total } };
		}) as never);

		const items = await docsService.listAll({ kind: [EDocumentKind.PAGE] });

		expect(get.mock.calls.map(([url]) => asked(String(url)).skip)).toEqual([1, 2, 3]);
		expect(items).toHaveLength(total);
		expect(items[items.length - 1].id).toBe(`p${total}`);
	});

	it('stops after a full last page without asking for an empty one', async () => {
		const total = DOCS_LIST_PAGE_SIZE;
		const get = jest.spyOn(docsService, 'get').mockResolvedValue({ data: { items: rows(1, total), total } } as never);

		await expect(docsService.listAll({})).resolves.toHaveLength(total);
		expect(get).toHaveBeenCalledTimes(1);
	});

	it('keeps a row once when it comes in two pages (it moved between the reads)', async () => {
		const full = rows(1, DOCS_LIST_PAGE_SIZE);
		const get = jest
			.spyOn(docsService, 'get')
			.mockResolvedValueOnce({ data: { items: full, total: DOCS_LIST_PAGE_SIZE + 1 } } as never)
			.mockResolvedValueOnce({ data: { items: [full[full.length - 1], page('late')], total: DOCS_LIST_PAGE_SIZE + 1 } } as never);

		const items = await docsService.listAll({});

		expect(get).toHaveBeenCalledTimes(2);
		expect(items).toHaveLength(DOCS_LIST_PAGE_SIZE + 1);
		expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
	});

	it('stops at the cap of the tree', async () => {
		const get = jest.spyOn(docsService, 'get').mockImplementation((async (url: string) => {
			const { take, skip } = asked(url);
			const first = take * (skip - 1) + 1;
			return { data: { items: rows(first, first + take - 1), total: 1_000_000 } };
		}) as never);

		const items = await docsService.listAll({});

		expect(items).toHaveLength(DOCS_TREE_MAX_PAGES);
		expect(get).toHaveBeenCalledTimes(DOCS_TREE_MAX_PAGES / DOCS_LIST_PAGE_SIZE);
	});
});

/**
 * The live routes validate their body with `forbidNonWhitelisted`: an edit or a cursor carrying anything beyond the
 * connection and the payload (the scope the other writes add, for one) would be refused with 400.
 */
describe('docsService live and collaboration routes', () => {
	afterEach(() => jest.restoreAllMocks());

	it('sends an edit and a cursor with exactly the connection and the payload', async () => {
		const post = jest.spyOn(docsService, 'post').mockResolvedValue({ data: { accepted: true, relayed: false } } as never);

		await docsService.liveUpdate('page/1', { connectionId: 'tab12345', update: 'AAE=', extra: 'x' } as never);
		await docsService.liveAwareness('page/1', { connectionId: 'tab12345', awareness: 'AQI=' });

		// The last argument keeps `post` from adding the tenant and organization to the body: the routes refuse them.
		expect(post.mock.calls[0]).toEqual(['/plugins/docs/documents/page%2F1/live/updates', { connectionId: 'tab12345', update: 'AAE=' }, undefined, false]);
		expect(post.mock.calls[1]).toEqual(['/plugins/docs/documents/page%2F1/live/awareness', { connectionId: 'tab12345', awareness: 'AQI=' }, undefined, false]);
	});

	it('asks the live status, the spaces and the follow state where the platform serves them', async () => {
		const get = jest.spyOn(docsService, 'get').mockResolvedValue({ data: [] } as never);

		await docsService.liveStatus();
		await docsService.spaces();
		await docsService.followState('p1');

		expect(String(get.mock.calls[0][0])).toBe('/plugins/docs/live/status');
		expect(String(get.mock.calls[1][0]).split('?')[0]).toBe('/plugins/docs/documents/spaces');
		expect(String(get.mock.calls[2][0])).toBe('/plugins/docs/documents/p1/follow');
	});

	it('follows, mutes and moves a page to a space', async () => {
		const post = jest.spyOn(docsService, 'post').mockResolvedValue({ data: { following: true, muted: false } } as never);

		await docsService.setFollow('p1', 'mute');
		await docsService.moveToSpace('p1', { visibility: EDocumentVisibility.TEAM, organizationTeamId: 'team-a', applyToSubtree: true });

		expect(post.mock.calls[0]).toEqual(['/plugins/docs/documents/p1/mute', {}]);
		expect(post.mock.calls[1][0]).toBe('/plugins/docs/documents/p1/space');
		expect(post.mock.calls[1][1]).toMatchObject({ visibility: 'TEAM', organizationTeamId: 'team-a', applyToSubtree: true });
	});
});

describe('docsService.exportSubtreeZip', () => {
	afterEach(() => jest.restoreAllMocks());

	it('asks the platform for the page and its sub-pages as a zip, read as a file', async () => {
		const zip = new Blob(['PK'], { type: 'application/zip' });
		const get = jest.spyOn(docsService, 'get').mockResolvedValue({ data: zip } as never);

		await expect(docsService.exportSubtreeZip('page/1')).resolves.toBe(zip);

		const [url, config] = get.mock.calls[0];
		expect(String(url).split('?')[0]).toBe('/plugins/docs/documents/page%2F1/export/markdown');
		expect(qs.parse(String(url).split('?')[1]).subtree).toBe('true');
		expect(config).toMatchObject({ responseType: 'blob' });
	});
});

describe('docsService comment anchors', () => {
	afterEach(() => jest.restoreAllMocks());

	it("reads the page's comment ranges with its scope", async () => {
		const get = jest.spyOn(docsService, 'get').mockResolvedValue({ data: { documentId: 'p1', revision: 3, live: false, items: [] } } as never);

		await expect(docsService.commentAnchors('p1')).resolves.toMatchObject({ revision: 3, items: [] });

		expect(String(get.mock.calls[0][0]).split('?')[0]).toBe('/plugins/docs/documents/p1/comment-anchors');
	});

	it('sends the anchor fields only (no empty context, live ends together), with the scope the route accepts', async () => {
		const put = jest.spyOn(docsService, 'put').mockResolvedValue({ data: { commentId: 'c/1' } } as never);

		await docsService.setCommentAnchor('p1', 'c/1', {
			blockId: 'b1',
			start: 2,
			end: 5,
			quote: 'abc',
			prefix: '',
			suffix: 'x',
			relativeStart: 'AAA=',
			relativeEnd: null,
			...({ position: { status: 'exact' }, id: 'a1' } as object)
		});

		const [url, body] = put.mock.calls[0];
		expect(url).toBe('/plugins/docs/documents/p1/comments/c%2F1/anchor');
		expect(body).toMatchObject({ blockId: 'b1', start: 2, end: 5, quote: 'abc', suffix: 'x' });
		expect(Object.keys(body as object).sort()).toEqual(['blockId', 'end', 'organizationId', 'quote', 'start', 'suffix', 'tenantId']);
	});

	it("removes a comment's range", async () => {
		const remove = jest.spyOn(docsService, 'delete').mockResolvedValue({ data: { removed: true } } as never);

		await expect(docsService.removeCommentAnchor('p1', 'c1')).resolves.toBe(true);

		expect(String(remove.mock.calls[0][0]).split('?')[0]).toBe('/plugins/docs/documents/p1/comments/c1/anchor');
	});
});
