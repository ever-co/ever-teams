import { docsInboxHrefOf, docsLinkTargetOf, docsPageHref, docsPageUrl, isDocsInboxEntry, taskIdOfHref, withoutDocsLinkTarget } from './docs-links';

const PAGE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const BLOCK = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const COMMENT = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const TASK = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const ORIGIN = 'https://app.example.test';

describe('page addresses', () => {
	it('writes a page, a block, a thread and the comments', () => {
		expect(docsPageHref(PAGE)).toBe(`/docs/${PAGE}`);
		expect(docsPageHref(PAGE, { block: BLOCK })).toBe(`/docs/${PAGE}?block=${BLOCK}`);
		expect(docsPageHref(PAGE, { thread: COMMENT })).toBe(`/docs/${PAGE}?thread=${COMMENT}`);
		expect(docsPageHref(PAGE, { comments: true })).toBe(`/docs/${PAGE}?comments=1`);
		// A thread opens the comments by itself.
		expect(docsPageHref(PAGE, { thread: COMMENT, comments: true })).toBe(`/docs/${PAGE}?thread=${COMMENT}`);
		expect(docsPageHref('a/b')).toBe('/docs/a%2Fb');
		expect(docsPageUrl(`${ORIGIN}/`, PAGE, { block: BLOCK })).toBe(`${ORIGIN}/docs/${PAGE}?block=${BLOCK}`);
	});

	it('reads the place an address asks for, ignoring what is no id', () => {
		expect(docsLinkTargetOf(`?block=${BLOCK}&thread=${COMMENT}`)).toEqual({ block: BLOCK, thread: COMMENT, comments: false });
		expect(docsLinkTargetOf(new URLSearchParams('comments=1'))).toEqual({ block: null, thread: null, comments: true });
		expect(docsLinkTargetOf('block=<script>&thread=1')).toEqual({ block: null, thread: null, comments: false });
		expect(docsLinkTargetOf(null)).toEqual({ block: null, thread: null, comments: false });
	});

	it('takes the places out of an address and keeps the rest', () => {
		expect(withoutDocsLinkTarget(`/docs/${PAGE}?block=${BLOCK}&tree=1#top`)).toBe(`/docs/${PAGE}?tree=1#top`);
		expect(withoutDocsLinkTarget(`/docs/${PAGE}?thread=${COMMENT}&comments=1`)).toBe(`/docs/${PAGE}`);
	});
});

describe('task links', () => {
	it("reads this app's task pages, with or without a locale, absolute or relative", () => {
		expect(taskIdOfHref(`${ORIGIN}/task/${TASK}`, ORIGIN)).toBe(TASK);
		expect(taskIdOfHref(`/task/${TASK}`, ORIGIN)).toBe(TASK);
		expect(taskIdOfHref(`${ORIGIN}/en/task/${TASK}?tab=comments`, ORIGIN)).toBe(TASK);
		expect(taskIdOfHref(`${ORIGIN}/pt-BR/task/${TASK}`, ORIGIN)).toBe(TASK);
	});

	it('refuses another origin, another path and what is no id', () => {
		expect(taskIdOfHref(`https://elsewhere.example/task/${TASK}`, ORIGIN)).toBeNull();
		expect(taskIdOfHref(`${ORIGIN}/task/${TASK}/edit`, ORIGIN)).toBeNull();
		expect(taskIdOfHref(`${ORIGIN}/projects/${TASK}`, ORIGIN)).toBeNull();
		expect(taskIdOfHref(`${ORIGIN}/task/42`, ORIGIN)).toBeNull();
		expect(taskIdOfHref('mailto:someone@example.test', ORIGIN)).toBeNull();
		expect(taskIdOfHref('', ORIGIN)).toBeNull();
		expect(taskIdOfHref(null, ORIGIN)).toBeNull();
	});
});

describe('Inbox entries about pages', () => {
	it('opens a mention in a page comment on its thread', () => {
		expect(docsInboxHrefOf('Comment', COMMENT, { parentEntity: 'Document', parentEntityId: PAGE })).toBe(`/docs/${PAGE}?thread=${COMMENT}`);
	});

	it("opens a followed page's comment on the page with its comments, and anything else on the page", () => {
		expect(docsInboxHrefOf('Document', PAGE, null, true)).toBe(`/docs/${PAGE}?comments=1`);
		expect(docsInboxHrefOf('Document', PAGE, null)).toBe(`/docs/${PAGE}`);
	});

	it('leaves the entries of other records alone', () => {
		expect(docsInboxHrefOf('Comment', COMMENT, { parentEntity: 'Task', parentEntityId: TASK })).toBeNull();
		expect(docsInboxHrefOf('Comment', COMMENT, { parentEntity: 'Document' })).toBeNull();
		expect(docsInboxHrefOf('Task', TASK, null)).toBeNull();
		expect(docsInboxHrefOf('Document', null, null)).toBeNull();
	});

	it('tells which entries are about pages', () => {
		expect(isDocsInboxEntry('Document', null)).toBe(true);
		expect(isDocsInboxEntry('DocumentLink', null)).toBe(true);
		expect(isDocsInboxEntry('Comment', { parentEntity: 'Document' })).toBe(true);
		expect(isDocsInboxEntry('Comment', { parentEntity: 'Task' })).toBe(false);
		expect(isDocsInboxEntry('Task', null)).toBe(false);
	});
});
