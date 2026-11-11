import { EDocumentKind, EDocumentVisibility, type IDocumentPage } from '@/core/types/interfaces/common/docs';
import {
	ancestorIdsOf,
	buildDocTree,
	canMoveUnder,
	compareSiblings,
	descendantIdsOf,
	filterPagesLocally,
	flattenTree,
	nextFocusIndex,
	nextIndexUnder,
	pageTitle,
	reorderedIds,
	sortByUpdated,
	splitSpaces
} from './docs-tree';

function page(id: string, overrides: Partial<IDocumentPage> = {}): IDocumentPage {
	return {
		id,
		kind: EDocumentKind.PAGE,
		parentId: null,
		index: 0,
		name: id,
		visibility: EDocumentVisibility.ORGANIZATION,
		createdAt: '2026-11-07T00:00:00.000Z',
		updatedAt: '2026-11-07T00:00:00.000Z',
		...overrides
	};
}

const PAGES = [
	page('b', { index: 1 }),
	page('a', { index: 0 }),
	page('a1', { parentId: 'a', index: 0 }),
	page('a2', { parentId: 'a', index: 1 }),
	page('a2x', { parentId: 'a2' }),
	page('orphan', { parentId: 'missing' })
];

describe('buildDocTree', () => {
	it('nests by parent, sorts siblings by index (then name) and lifts orphans to the root', () => {
		const tree = buildDocTree(PAGES);
		expect(tree.roots.map((node) => node.page.id)).toEqual(['a', 'orphan', 'b']);
		expect(tree.byId.get('a')?.children.map((node) => node.page.id)).toEqual(['a1', 'a2']);
		expect(tree.byId.get('a2x')?.depth).toBe(2);
	});

	it('surfaces a parent cycle instead of dropping the pages', () => {
		const tree = buildDocTree([page('x', { parentId: 'y' }), page('y', { parentId: 'x' })]);
		expect(tree.roots.map((node) => node.page.id)).toEqual(['x']);
		expect(tree.byId.get('x')?.children.map((node) => node.page.id)).toEqual(['y']);
	});

	it('breaks index ties by name, case-insensitively', () => {
		expect([page('2', { name: 'beta' }), page('1', { name: 'Alpha' })].sort(compareSiblings).map((p) => p.id)).toEqual(['1', '2']);
	});
});

describe('flattenTree', () => {
	it('shows the children of expanded pages only', () => {
		const tree = buildDocTree(PAGES);
		expect(flattenTree(tree.roots, new Set()).map((node) => node.page.id)).toEqual(['a', 'orphan', 'b']);
		expect(flattenTree(tree.roots, new Set(['a'])).map((node) => node.page.id)).toEqual(['a', 'a1', 'a2', 'orphan', 'b']);
		expect(flattenTree(tree.roots, new Set(['a', 'a2'])).map((node) => node.page.id)).toEqual(['a', 'a1', 'a2', 'a2x', 'orphan', 'b']);
	});
});

describe('ancestors, descendants and moves', () => {
	const tree = buildDocTree(PAGES);

	it('lists ancestors root first', () => {
		expect(ancestorIdsOf(tree, 'a2x')).toEqual(['a', 'a2']);
		expect(ancestorIdsOf(tree, 'a')).toEqual([]);
	});

	it('lists every descendant', () => {
		expect(descendantIdsOf(tree, 'a')).toEqual(['a1', 'a2', 'a2x']);
		expect(descendantIdsOf(tree, 'b')).toEqual([]);
	});

	it('refuses a move under itself or its own sub-page', () => {
		expect(canMoveUnder(tree, 'a', null)).toBe(true);
		expect(canMoveUnder(tree, 'a', 'b')).toBe(true);
		expect(canMoveUnder(tree, 'a', 'a')).toBe(false);
		expect(canMoveUnder(tree, 'a', 'a2x')).toBe(false);
	});

	it('gives the next index at the end of the siblings', () => {
		expect(nextIndexUnder(tree, null)).toBe(2);
		expect(nextIndexUnder(tree, 'a')).toBe(2);
		expect(nextIndexUnder(tree, 'b')).toBe(0);
	});
});

describe('reorderedIds', () => {
	it('swaps with the neighbour and refuses past the ends', () => {
		expect(reorderedIds(['a', 'b', 'c'], 'b', 'up')).toEqual(['b', 'a', 'c']);
		expect(reorderedIds(['a', 'b', 'c'], 'b', 'down')).toEqual(['a', 'c', 'b']);
		expect(reorderedIds(['a', 'b', 'c'], 'a', 'up')).toBeNull();
		expect(reorderedIds(['a', 'b', 'c'], 'c', 'down')).toBeNull();
		expect(reorderedIds(['a', 'b', 'c'], 'zz', 'down')).toBeNull();
	});
});

describe('spaces, titles and sorting', () => {
	it('splits private pages from the workspace', () => {
		const { workspace, privatePages } = splitSpaces([page('w'), page('p', { visibility: EDocumentVisibility.PRIVATE })]);
		expect(workspace.map((p) => p.id)).toEqual(['w']);
		expect(privatePages.map((p) => p.id)).toEqual(['p']);
	});

	it('puts team pages in their team space, and a team page without its team in the workspace', () => {
		const { workspace, privatePages, teamPages } = splitSpaces([
			page('w'),
			page('t1', { visibility: EDocumentVisibility.TEAM, organizationTeamId: 'team-a' }),
			page('t2', { visibility: EDocumentVisibility.TEAM, organizationTeamId: 'team-b' }),
			page('t3', { visibility: EDocumentVisibility.TEAM, organizationTeamId: 'team-a' }),
			page('orphan', { visibility: EDocumentVisibility.TEAM, organizationTeamId: null })
		]);
		expect(workspace.map((p) => p.id)).toEqual(['w', 'orphan']);
		expect(privatePages).toEqual([]);
		expect(teamPages.get('team-a')?.map((p) => p.id)).toEqual(['t1', 't3']);
		expect(teamPages.get('team-b')?.map((p) => p.id)).toEqual(['t2']);
	});

	it('reads a blank name as untitled', () => {
		expect(pageTitle(page('x', { name: '  ' }), 'Untitled')).toBe('Untitled');
		expect(pageTitle(page('x', { name: 'Plan' }), 'Untitled')).toBe('Plan');
		expect(pageTitle(null, 'Untitled')).toBe('Untitled');
	});

	it('sorts by the newest change first', () => {
		const sorted = sortByUpdated([page('old', { updatedAt: '2026-01-01T00:00:00Z' }), page('new', { updatedAt: '2026-02-01T00:00:00Z' })]);
		expect(sorted.map((p) => p.id)).toEqual(['new', 'old']);
	});

	it('filters by every word of the query', () => {
		const pages = [page('1', { name: 'Release plan' }), page('2', { name: 'Notes', description: 'release meeting' }), page('3', { name: 'Other' })];
		expect(filterPagesLocally(pages, 'release').map((p) => p.id)).toEqual(['1', '2']);
		expect(filterPagesLocally(pages, 'release plan').map((p) => p.id)).toEqual(['1']);
		expect(filterPagesLocally(pages, '  ').map((p) => p.id)).toEqual(['1', '2', '3']);
	});
});

describe('nextFocusIndex', () => {
	it('moves within the rows and ignores other keys', () => {
		expect(nextFocusIndex(3, -1, 'ArrowDown')).toBe(0);
		expect(nextFocusIndex(3, 2, 'ArrowDown')).toBe(2);
		expect(nextFocusIndex(3, -1, 'ArrowUp')).toBe(2);
		expect(nextFocusIndex(3, 0, 'ArrowUp')).toBe(0);
		expect(nextFocusIndex(3, 1, 'Home')).toBe(0);
		expect(nextFocusIndex(3, 1, 'End')).toBe(2);
		expect(nextFocusIndex(3, 1, 'Enter')).toBe(-1);
		expect(nextFocusIndex(0, 0, 'ArrowDown')).toBe(-1);
	});
});
