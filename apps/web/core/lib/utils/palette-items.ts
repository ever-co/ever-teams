/**
 * What the command palette finds besides tasks, commands and the chat's own results: the people of the active team,
 * the projects and the Docs pages, each as one entry with where it leads. Pure, so the specs run without a browser.
 */

export type PaletteItemKind = 'task' | 'person' | 'project' | 'page';

export interface PaletteItem {
	kind: PaletteItemKind;
	id: string;
	title: string;
	/** Where the entry leads, inside the app. */
	href: string;
	/** A picture (a person, a project) or an emoji (a page). */
	imageUrl?: string | null;
	icon?: string | null;
}

/** The most entries of one kind the palette lists for a search. */
export const PALETTE_RESULTS_LIMIT = 8;

interface PaletteMember {
	employeeId?: string | null;
	employee?: {
		id?: string | null;
		userId?: string | null;
		fullName?: string | null;
		user?: { id?: string | null; name?: string | null; imageUrl?: string | null } | null;
	} | null;
}

interface PaletteProject {
	id: string;
	name?: string | null;
	imageUrl?: string | null;
	isArchived?: boolean | null;
	archivedAt?: string | null;
}

interface PalettePage {
	id: string;
	name?: string | null;
	icon?: string | null;
	isArchived?: boolean | null;
}

function trimmed(value: string | null | undefined): string {
	return (value ?? '').trim();
}

/**
 * The people of the active team, each leading to their profile (it opens on a member of the active team, by user
 * id); a member without a user or a name is left out.
 */
export function personItemsOf(members: readonly PaletteMember[] | null | undefined): PaletteItem[] {
	const items: PaletteItem[] = [];
	const seen = new Set<string>();
	for (const member of members ?? []) {
		const employee = member.employee;
		const userId = trimmed(employee?.userId ?? employee?.user?.id);
		const name = trimmed(employee?.fullName) || trimmed(employee?.user?.name);
		if (!userId || !name || seen.has(userId)) continue;
		seen.add(userId);
		items.push({
			kind: 'person',
			id: userId,
			title: name,
			href: `/profile/${encodeURIComponent(userId)}?name=${encodeURIComponent(name)}`,
			imageUrl: employee?.user?.imageUrl ?? null
		});
	}
	return items.sort((first, second) => first.title.localeCompare(second.title));
}

/** The projects that are not archived, each leading to its page. */
export function projectItemsOf(projects: readonly PaletteProject[] | null | undefined): PaletteItem[] {
	return (projects ?? [])
		.filter((project) => !project.isArchived && !project.archivedAt && trimmed(project.name))
		.map<PaletteItem>((project) => ({
			kind: 'project',
			id: project.id,
			title: trimmed(project.name),
			href: `/projects/${encodeURIComponent(project.id)}`,
			imageUrl: project.imageUrl ?? null
		}))
		.sort((first, second) => first.title.localeCompare(second.title));
}

/** The Docs pages the platform found, in its order (best match first); a page in the trash is left out. */
export function pageItemsOf(pages: readonly PalettePage[] | null | undefined, untitled: string): PaletteItem[] {
	return (pages ?? [])
		.filter((page) => !page.isArchived)
		.map<PaletteItem>((page) => ({
			kind: 'page',
			id: page.id,
			title: trimmed(page.name) || untitled,
			href: `/docs/${encodeURIComponent(page.id)}`,
			icon: page.icon ?? null
		}));
}

/**
 * The entries whose title has every word of the search (any case, any order), the titles starting with the search
 * first, at most `limit`. An empty search finds nothing: the palette lists these kinds only for a search.
 */
export function matchingItems(
	items: readonly PaletteItem[],
	search: string,
	limit = PALETTE_RESULTS_LIMIT
): PaletteItem[] {
	const query = search.trim().toLowerCase();
	if (!query) return [];
	const words = query.split(/\s+/);
	const matches = items.filter((item) => {
		const title = item.title.toLowerCase();
		return words.every((word) => title.includes(word));
	});
	const startsFirst = (item: PaletteItem) => (item.title.toLowerCase().startsWith(query) ? 0 : 1);
	return matches.sort((first, second) => startsFirst(first) - startsFirst(second)).slice(0, limit);
}

/** The value the palette identifies an entry by: unique across kinds, and found by its title. */
export function paletteValueOf(item: Pick<PaletteItem, 'kind' | 'id' | 'title'>): string {
	return `${item.title} ${item.kind}:${item.id}`;
}
