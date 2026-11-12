import type { SidebarPage } from './sidebar-pages';

/**
 * The command palette's "Go to" group: one row per page the sidebar lists, each tied to the shortcut registry's
 * command that leads to the same page, so the row shows that command's keys. Pure.
 */

export type GoToFlag = 'NEXT_PUBLIC_DOCS_ENABLED' | 'NEXT_PUBLIC_CHAT_ENABLED' | 'NEXT_PUBLIC_INBOX_ENABLED';

/** A "go to" command of the shortcut registry and the page it leads to. */
export interface GoToCommandPath {
	id: string;
	path: string;
	/** Leads to a page under the path, whichever it is: the signed-in person's profile, their timesheet. */
	below?: boolean;
	/** The switch of the sibling feature the page exists with. */
	flag?: GoToFlag;
}

/** The registry's "go to" commands the layout runs; the palette lists them even when the sidebar has no such page. */
export const REGISTRY_GO_TO: readonly GoToCommandPath[] = [
	{ id: 'goTasks', path: '/team/tasks' },
	{ id: 'goMine', path: '/views/mine' },
	{ id: 'goThisWeek', path: '/views/this-week' },
	{ id: 'goOverdue', path: '/views/overdue' },
	{ id: 'goViews', path: '/views' },
	{ id: 'goDocs', path: '/docs', flag: 'NEXT_PUBLIC_DOCS_ENABLED' },
	{ id: 'goChat', path: '/chat', flag: 'NEXT_PUBLIC_CHAT_ENABLED' },
	{ id: 'goInbox', path: '/inbox', flag: 'NEXT_PUBLIC_INBOX_ENABLED' }
];

/** The "go to" commands the palette runs itself (its handlers hold their links). */
const PALETTE_GO_TO: readonly GoToCommandPath[] = [
	{ id: 'goHome', path: '/' },
	{ id: 'goProjects', path: '/projects' },
	{ id: 'goKanban', path: '/kanban' },
	{ id: 'goWeeklyLimit', path: '/reports/weekly-limit' },
	{ id: 'goTimeActivity', path: '/reports/time-and-activity' },
	{ id: 'goProfile', path: '/profile', below: true },
	{ id: 'goTimesheets', path: '/reports/timesheet', below: true }
];

const GO_TO_COMMAND_PATHS: readonly GoToCommandPath[] = [...REGISTRY_GO_TO, ...PALETTE_GO_TO];

/** How a page under a sidebar group reads in the palette: "Reports › Timesheets". */
export const SECTION_SEPARATOR = ' › ';

/** The group of hard-coded links the palette had before it read the sidebar, and the group that lists the pages. */
const NAVIGATION_GROUP_ID = 'navigation';
export const GO_TO_GROUP_ID = 'goTo';

function pathOf(url: string): string {
	const withoutHash = url.split('#')[0];
	return withoutHash.split('?')[0];
}

/** A link with a query (the archived projects) is another page than its path: only the bare link is the command's. */
function leadsTo(command: GoToCommandPath, url: string): boolean {
	if (command.below) {
		return pathOf(url).startsWith(`${command.path}/`);
	}
	return url === command.path;
}

/** The registry command that leads to the page a link opens, if one does. */
export function goToCommandIdOf(url: string): string | undefined {
	const command = GO_TO_COMMAND_PATHS.find((entry) => leadsTo(entry, url));
	return command?.id;
}

export interface GoToRow {
	label: string;
	title: string;
	/** Written muted before the title, like the ancestors of a breadcrumb. */
	section?: string;
	url: string;
	/** The registry command that leads to the same page: the row shows its keys. */
	commandId?: string;
}

function labelOf(page: SidebarPage): string {
	if (!page.section) {
		return page.title;
	}
	return `${page.section}${SECTION_SEPARATOR}${page.title}`;
}

/**
 * The rows of "Go to", in the order of the sidebar. A page the sidebar links twice (Time & activity, under My work
 * and under Reports) is listed once, and so is a name: the palette tells its rows apart by their text. A registry
 * command goes to the first row that leads where it leads.
 */
export function goToRowsOf(pages: readonly SidebarPage[]): GoToRow[] {
	const rows: GoToRow[] = [];
	const listedUrls = new Set<string>();
	const listedLabels = new Set<string>();
	const givenCommands = new Set<string>();
	for (const page of pages) {
		const label = labelOf(page);
		const isRepeat = listedUrls.has(page.url) || listedLabels.has(label);
		if (isRepeat) {
			continue;
		}
		listedUrls.add(page.url);
		listedLabels.add(label);
		const row: GoToRow = { label, title: page.title, section: page.section, url: page.url };
		const commandId = goToCommandIdOf(page.url);
		const isCommandFree = commandId !== undefined && !givenCommands.has(commandId);
		if (isCommandFree) {
			row.commandId = commandId;
			givenCommands.add(commandId);
		}
		rows.push(row);
	}
	return rows;
}

function isGoToCommand(commandId: string): boolean {
	return GO_TO_COMMAND_PATHS.some((command) => command.id === commandId);
}

function listsPageOf(commandId: string, pages: readonly SidebarPage[]): boolean {
	return pages.some((page) => goToCommandIdOf(page.url) === commandId);
}

/**
 * The handlers without the "go to" ones whose page the sidebar does not list for this person (a report for
 * managers): the registry then has no handler for their keys, so the keys do nothing and the shortcuts sheet does not
 * list them. Without a list from the sidebar, every handler stays.
 */
export function openablePageHandlers<Handler>(
	handlers: Record<string, Handler>,
	pages: readonly SidebarPage[] | undefined
): Record<string, Handler> {
	if (!pages) {
		return handlers;
	}
	const openable: Record<string, Handler> = {};
	for (const [commandId, handler] of Object.entries(handlers)) {
		const isRefused = isGoToCommand(commandId) && !listsPageOf(commandId, pages);
		if (!isRefused) {
			openable[commandId] = handler;
		}
	}
	return openable;
}

interface PaletteKeys {
	commandId?: string;
	shortcutDisplay: string;
	shortcutKeys?: string[];
}

interface PaletteGroup<Command> {
	id: string;
	commands: Command[];
}

/** The row with the keys of the hard-coded link it takes the place of, when it takes the place of one. */
function withKeysOfReplacedLink<Command extends PaletteKeys>(
	row: Command,
	replacedLinks: ReadonlyMap<string, Command>
): Command {
	if (!row.commandId) {
		return row;
	}
	const replaced = replacedLinks.get(row.commandId);
	if (!replaced) {
		return row;
	}
	return { ...row, shortcutDisplay: replaced.shortcutDisplay, shortcutKeys: replaced.shortcutKeys };
}

/**
 * The groups the palette lists once the sidebar hands it its pages. The hard-coded links of the "navigation" group
 * are rows of "Go to" then (the ones this person can open), so that group is not listed; each row that takes the
 * place of one of its links shows that link's keys. Without a list from the sidebar, the groups stay as they are.
 */
export function paletteListedGroups<Command extends PaletteKeys, Group extends PaletteGroup<Command>>(
	groups: readonly Group[],
	pages: readonly SidebarPage[] | undefined
): Group[] {
	if (!pages) {
		return [...groups];
	}
	const navigation = groups.find((group) => group.id === NAVIGATION_GROUP_ID);
	const replacedLinks = new Map<string, Command>();
	for (const command of navigation?.commands ?? []) {
		if (command.commandId) {
			replacedLinks.set(command.commandId, command);
		}
	}
	const listed: Group[] = [];
	for (const group of groups) {
		if (group.id === NAVIGATION_GROUP_ID) {
			continue;
		}
		if (group.id !== GO_TO_GROUP_ID) {
			listed.push(group);
			continue;
		}
		const commands = group.commands.map((row) => withKeysOfReplacedLink(row, replacedLinks));
		listed.push({ ...group, commands });
	}
	return listed;
}

export interface GoToPreview {
	/** The group shows part of its pages: the others are behind "Show more". */
	hasMorePages?: boolean;
}

function isTiedToCommand(row: PaletteKeys): boolean {
	return Boolean(row.commandId);
}

/**
 * The groups as the "All" tab lists them before anything is typed: "Go to" keeps the pages that have keys, the
 * destinations the palette listed before it read the sidebar, and says it has more. A group where every page has
 * keys, or none has, stays whole; typing or the "Go to" tab lists every page.
 */
export function withGoToPreview<Command extends PaletteKeys, Group extends PaletteGroup<Command>>(
	groups: readonly Group[]
): Array<Group & GoToPreview> {
	return groups.map((group) => {
		if (group.id !== GO_TO_GROUP_ID) {
			return group;
		}
		const keyedPages = group.commands.filter(isTiedToCommand);
		const hasKeyedPages = keyedPages.length > 0;
		const hasOtherPages = keyedPages.length < group.commands.length;
		if (!hasKeyedPages || !hasOtherPages) {
			return group;
		}
		return { ...group, commands: keyedPages, hasMorePages: true };
	});
}
