/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

let mockCanInvite = false;
let mockRegistryOn = false;
let mockRegistered = new Map<string, () => void>();
const mockUseKeyboardShortcuts = jest.fn();
const mockRegisterHandlers = jest.fn();
const mockSetOpen = jest.fn();
const mockSetShortcutsSheetOpen = jest.fn();

jest.mock('@/core/hooks/invitations/use-can-invite-to-active-team', () => ({
	useCanInviteToActiveTeam: () => mockCanInvite
}));
jest.mock('@/core/hooks/common/use-keyboard-shortcuts', () => ({
	useKeyboardShortcuts: (...args: unknown[]) => mockUseKeyboardShortcuts(...args)
}));
// The "Go to" entries read the bindings in force from the signed-in user's preferences (a query); the palette under
// test has no query client, and those entries are not what this suite reads.
jest.mock('@/core/hooks/keyboard/use-keyboard-preferences', () => {
	const { effectiveBindings, SHORTCUT_COMMANDS } = jest.requireActual('@/core/lib/keyboard/shortcuts');
	const bindings = effectiveBindings(SHORTCUT_COMMANDS, null);
	return { useKeyboardPreferences: () => ({ bindings, overrides: {}, setOverrides: jest.fn(), canRebind: false }) };
});
// The registry's side: the handlers the palette registers, and the ones registered app-wide (`mockRegistered`).
jest.mock('@/core/hooks/keyboard/use-shortcuts', () => ({
	useShortcutHandlers: (handlers: Record<string, () => void>) => mockRegisterHandlers(handlers)
}));
jest.mock('@/core/stores/common/shortcuts', () => ({
	shortcutHandlersAtom: Symbol('shortcut-handlers'),
	shortcutsHelpOpenAtom: Symbol('shortcuts-help')
}));
jest.mock('@/core/lib/utils/task-views-enabled', () => ({ isTaskViewsEnabled: () => mockRegistryOn }));
const mockRecent = [
	{ kind: 'task', id: 'task-1', title: 'A task', href: '/task/task-1' },
	{ kind: 'page', id: 'page-1', title: 'A page', href: '/docs/page-1' }
];
jest.mock('@/core/hooks/keyboard/use-palette-recent', () => ({
	usePaletteRecent: () => ({ items: mockRecent, remember: jest.fn() })
}));
jest.mock('@/core/hooks/common/use-detect-os', () => ({ useDetectOS: () => ({ os: 'Mac' }) }));
jest.mock('../../../../hooks/auth', () => ({
	useAuthenticateUser: () => ({ user: { id: 'user-1', name: 'User', isEmailVerified: true } })
}));
jest.mock('../../../../hooks', () => ({
	useModal: () => ({ isOpen: false, openModal: jest.fn(), closeModal: jest.fn() })
}));
jest.mock('jotai', () => ({
	useAtom: () => [true, mockSetOpen],
	useAtomValue: () => mockRegistered,
	useSetAtom: () => mockSetShortcutsSheetOpen
}));
jest.mock('@/core/stores/common/command-palette', () => ({ commandPaletteOpenAtom: Symbol('command-palette') }));
const mockPush = jest.fn();
let mockChatOn = false;
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/core/lib/utils/chat-enabled', () => ({ isChatEnabled: () => mockChatOn }));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('next-themes', () => ({ useTheme: () => ({ setTheme: jest.fn(), resolvedTheme: 'light' }) }));
jest.mock('lucide-react', () => ({ ArrowUpRightIcon: () => null }));

// The palette renders inline, so its commands can be read without opening a dialog.
jest.mock('@/core/components/common/command', () => {
	const Pass = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
	return {
		CommandDialog: Pass,
		CommandEmpty: () => null,
		CommandGroup: Pass,
		CommandInput: ({ value, onValueChange }: { value: string; onValueChange: (value: string) => void }) => (
			<input aria-label="search" value={value} onChange={(event) => onValueChange(event.target.value)} />
		),
		CommandItem: Pass,
		CommandList: Pass,
		CommandShortcut: Pass
	};
});
jest.mock('./sidebar-command-form', () => ({ SidebarCommandForm: () => null }));
jest.mock('../../../common/badge', () => ({ Badge: () => null }));
jest.mock('../../../icons', () => {
	const Icon = () => null;
	return {
		AddIcon: Icon,
		AddTaskIcon: Icon,
		AddTeamIcon: Icon,
		AddUserIcon: Icon,
		DashboardIcon: Icon,
		Keyboard: Icon,
		MoonIcon: Icon,
		ProfileIcon: Icon,
		SettingsIcon: Icon,
		TasksIcon: Icon,
		TeamIcon: Icon,
		UserCircleIcon: Icon
	};
});
jest.mock('../../../common/modal', () => ({ Modal: () => null }));
jest.mock('../../../features/tasks/create-task-modal', () => ({ __esModule: true, default: () => null }));
jest.mock('../../../features/teams/invite-form-modal', () => ({ InviteFormModal: () => null }));
jest.mock('../../../features/projects/create-project-modal', () => ({ CreateProjectModal: () => null }));
jest.mock('@/core/components/features/teams/create-team-modal', () => ({ CreateTeamModal: () => null }));
jest.mock('./palette-task-results', () => ({ PaletteTaskResults: () => null }));
jest.mock('./palette-entity-results', () => ({
	PalettePageResults: () => null,
	PalettePeopleResults: () => null,
	PaletteProjectResults: () => null,
	PaletteRecentResults: ({ items }: { items: Array<{ id: string }> }) => (
		<div data-testid="recent">{items.map((item) => item.id).join(',')}</div>
	)
}));
jest.mock('./palette-chat-results', () => ({
	PaletteChatResults: ({ search }: { search: string }) => <div data-testid="chat-results">{search}</div>
}));
jest.mock('./palette-docs-results', () => ({ PaletteDocsResults: () => null }));

import { SidebarCommandModal } from './sidebar-command-modal';

/** The key sequences the palette registered as global shortcuts on its last render. */
function registeredSequences(): string[] {
	const [configs] = mockUseKeyboardShortcuts.mock.calls[mockUseKeyboardShortcuts.mock.calls.length - 1] as [
		Array<{ sequence: string[] }>
	];
	return configs.map((config) => config.sequence.join(' '));
}

describe('SidebarCommandModal invite command', () => {
	beforeEach(() => {
		mockUseKeyboardShortcuts.mockClear();
	});

	it('offers "Invite User" and its "i u" sequence to a user who may invite into the active team', () => {
		mockCanInvite = true;
		render(<SidebarCommandModal publicTeam={false} variant="none" />);

		expect(screen.getByText('commandPalette.commands.inviteUser')).toBeTruthy();
		expect(registeredSequences()).toContain('i u');
	});

	it('hides "Invite User" and drops its "i u" sequence for a user the API would refuse', () => {
		mockCanInvite = false;
		render(<SidebarCommandModal publicTeam={false} variant="none" />);

		expect(screen.queryByText('commandPalette.commands.inviteUser')).toBeNull();
		expect(registeredSequences()).not.toContain('i u');
		// The other commands stay.
		expect(screen.getByText('commandPalette.commands.assignToMe')).toBeTruthy();
		expect(registeredSequences()).toContain('a m');
	});
});

/** The key caps an entry shows, read next to its label. */
function keyCapsIn(label: HTMLElement): string[] {
	const row = label.parentElement as HTMLElement;
	return Array.from(row.querySelectorAll('kbd')).map((cap) => cap.textContent ?? '');
}

function keyCapsOf(descriptionKey: string): string[] {
	return keyCapsIn(screen.getByText(descriptionKey));
}

function readsAsRow(element: Element | null, label: string): boolean {
	const isLabel = element?.tagName === 'SPAN';
	const readsLabel = element?.textContent === label;
	return isLabel && readsLabel;
}

/** A "Go to" row by what it reads: its group sits in a muted span of its own, before the page's name. */
function pageRow(label: string): HTMLElement {
	return screen.getByText((_, element) => readsAsRow(element, label));
}

function queryPageRow(label: string): HTMLElement | null {
	return screen.queryByText((_, element) => readsAsRow(element, label));
}

function pageKeyCapsOf(label: string): string[] {
	return keyCapsIn(pageRow(label));
}

function mutedGroupOf(row: HTMLElement): string | null | undefined {
	return row.querySelector('.text-muted-foreground')?.textContent;
}

describe('SidebarCommandModal with the shortcut registry', () => {
	beforeEach(() => {
		mockRegistryOn = true;
		mockCanInvite = true;
		mockUseKeyboardShortcuts.mockClear();
		mockRegisterHandlers.mockClear();
		mockSetOpen.mockClear();
	});

	afterEach(() => {
		mockRegistryOn = false;
		mockRegistered = new Map();
	});

	it('leaves every key to the registry and registers the commands only the palette can run', () => {
		render(<SidebarCommandModal publicTeam={false} variant="none" />);

		expect(registeredSequences()).toEqual([]);
		const handlers = mockRegisterHandlers.mock.calls[mockRegisterHandlers.mock.calls.length - 1][0];
		expect(Object.keys(handlers).sort()).toEqual(
			[
				'goHome',
				'goKanban',
				'goProfile',
				'goProjects',
				'goTimeActivity',
				'goTimesheets',
				'goWeeklyLimit',
				'inviteUser',
				'projectCreate',
				'searchProjects',
				'searchTasks',
				'searchTeams',
				'teamCreate',
				'themeToggle'
			].sort()
		);
	});

	it('shows the binding in force of each entry someone can run, and none for the others', () => {
		mockRegistered = new Map([
			['goKanban', jest.fn()],
			['settingsOpen', jest.fn()],
			['taskCreate', jest.fn()]
		]);
		render(<SidebarCommandModal publicTeam={false} variant="none" />);

		expect(keyCapsOf('commandPalette.commands.goToKanban')).toEqual(['G', 'K']);
		expect(keyCapsOf('commandPalette.commands.settings')).toEqual(['⌘', ',']);
		expect(keyCapsOf('commandPalette.commands.createTask')).toEqual(['C']);
		// Nothing registered for it here, and "Assign to me" has no action yet: no key that would do nothing.
		expect(keyCapsOf('commandPalette.commands.goToTimesheets')).toEqual([]);
		expect(keyCapsOf('commandPalette.commands.assignToMe')).toEqual([]);
	});

	it('opens the palette on its tab from a "search" entry, as its keys do, instead of only closing it', () => {
		render(<SidebarCommandModal publicTeam={false} variant="none" />);
		fireEvent.click(screen.getByText('commandPalette.commands.searchTasks'));
		expect(mockSetOpen).toHaveBeenNthCalledWith(1, false);
		expect(mockSetOpen).toHaveBeenLastCalledWith(true);
	});

	it('lists the recent entries, leaving out pages while Docs is off', () => {
		render(<SidebarCommandModal publicTeam={false} variant="none" />);
		expect(screen.getByTestId('recent').textContent).toBe('task-1');
	});

	it('runs the command whose sequence is typed into the field, and closes the palette', () => {
		const goKanban = jest.fn();
		mockRegistered = new Map([['goKanban', goKanban]]);
		render(<SidebarCommandModal publicTeam={false} variant="none" />);
		const field = screen.getByLabelText('search') as HTMLInputElement;

		fireEvent.change(field, { target: { value: 'g' } });
		expect(goKanban).not.toHaveBeenCalled();
		fireEvent.change(field, { target: { value: 'g k' } });
		expect(goKanban).toHaveBeenCalledTimes(1);
		expect(mockSetOpen).toHaveBeenCalledWith(false);
		expect(field.value).toBe('');

		// A word is a search, not a sequence.
		fireEvent.change(field, { target: { value: 'gk' } });
		expect(goKanban).toHaveBeenCalledTimes(1);
		expect(field.value).toBe('gk');
	});
});

/** The pages a plain member's sidebar lists, and the ones a manager's adds. */
const MEMBER_PAGES = [
	{ title: 'Home', url: '/' },
	{ title: 'Kanban', url: '/kanban', section: 'Tasks' },
	{ title: 'Time & activity', url: '/reports/time-and-activity', section: 'My work' }
];
const MANAGER_PAGES = [
	...MEMBER_PAGES,
	{ title: 'Timesheets', url: '/reports/timesheet/user-1?name=User', section: 'Reports' },
	{ title: 'Weekly limit', url: '/reports/weekly-limit', section: 'Reports' }
];

/** The handlers the palette registered with the registry on its last render, by command. */
function registeredHandlerIds(): string[] {
	const handlers = mockRegisterHandlers.mock.calls[mockRegisterHandlers.mock.calls.length - 1][0];
	return Object.keys(handlers);
}

describe('SidebarCommandModal with the pages of the sidebar', () => {
	beforeEach(() => {
		mockUseKeyboardShortcuts.mockClear();
		mockRegisterHandlers.mockClear();
		mockSetOpen.mockClear();
		mockPush.mockClear();
	});

	afterEach(() => {
		mockRegistryOn = false;
		mockRegistered = new Map();
	});

	it('lists each page it is handed under "Go to", a page of a group read with the group first', () => {
		render(<SidebarCommandModal publicTeam={false} variant="none" pages={MANAGER_PAGES} />);

		expect(screen.getByText('Home')).toBeTruthy();
		expect(pageRow('Tasks › Kanban')).toBeTruthy();
		expect(pageRow('Reports › Timesheets')).toBeTruthy();
	});

	it('writes the group of a page muted, as the ancestors of a breadcrumb, and a first-level page alone', () => {
		render(<SidebarCommandModal publicTeam={false} variant="none" pages={MANAGER_PAGES} />);

		expect(mutedGroupOf(pageRow('Reports › Timesheets'))).toBe('Reports › ');
		expect(mutedGroupOf(pageRow('Home'))).toBeUndefined();
	});

	it('opens the page of the row chosen and closes the palette', () => {
		render(<SidebarCommandModal publicTeam={false} variant="none" pages={MANAGER_PAGES} />);

		fireEvent.click(pageRow('Reports › Timesheets'));

		expect(mockSetOpen).toHaveBeenCalledWith(false);
		expect(mockPush).toHaveBeenCalledWith('/reports/timesheet/user-1?name=User');
	});

	it('lists no page the sidebar does not hand it: a member sees no report for managers', () => {
		render(<SidebarCommandModal publicTeam={false} variant="none" pages={MEMBER_PAGES} />);

		expect(queryPageRow('Reports › Timesheets')).toBeNull();
		expect(screen.queryByText('commandPalette.commands.goToTimesheets')).toBeNull();
		expect(screen.queryByText('commandPalette.commands.goToWeeklyLimit')).toBeNull();
		expect(pageRow('My work › Time & activity')).toBeTruthy();
	});

	it('lists a page once: its hard-coded link gives way to the row, which keeps the keys of the link', () => {
		render(<SidebarCommandModal publicTeam={false} variant="none" pages={MEMBER_PAGES} />);

		expect(screen.queryByText('commandPalette.commands.goToKanban')).toBeNull();
		expect(pageKeyCapsOf('Tasks › Kanban')).toEqual(['⌘', 'K']);
		// The keys of the link are still the palette's: only its row moved.
		expect(registeredSequences()).toContain('k');
	});

	it('lists the pages that have keys before anything is typed, and the others behind "Show more"', () => {
		const pages = [...MEMBER_PAGES, { title: 'Calendar', url: '/calendar' }];
		render(<SidebarCommandModal publicTeam={false} variant="none" pages={pages} />);

		expect(pageRow('Tasks › Kanban')).toBeTruthy();
		expect(screen.queryByText('Calendar')).toBeNull();
		fireEvent.click(screen.getByText('common.SHOW_MORE'));

		expect(screen.getByText('Calendar')).toBeTruthy();
		expect(screen.queryByText('common.SHOW_MORE')).toBeNull();
		// "Show more" opens the "Go to" tab: the palette stays open.
		expect(mockSetOpen).not.toHaveBeenCalledWith(false);
	});

	it('lists every page once something is typed', () => {
		const pages = [...MEMBER_PAGES, { title: 'Calendar', url: '/calendar' }];
		render(<SidebarCommandModal publicTeam={false} variant="none" pages={pages} />);

		fireEvent.change(screen.getByLabelText('search'), { target: { value: 'cal' } });

		expect(screen.getByText('Calendar')).toBeTruthy();
		expect(screen.queryByText('common.SHOW_MORE')).toBeNull();
	});

	it('gives the registry no handler for a "go to" whose page it is not handed', () => {
		mockRegistryOn = true;
		render(<SidebarCommandModal publicTeam={false} variant="none" pages={MEMBER_PAGES} />);

		expect(registeredHandlerIds()).not.toContain('goTimesheets');
		expect(registeredHandlerIds()).not.toContain('goWeeklyLimit');
		expect(registeredHandlerIds()).toContain('goTimeActivity');
		expect(registeredHandlerIds()).toContain('themeToggle');
	});

	it('gives it the handlers of the reports for a manager, and shows on a row the keys of its command', () => {
		mockRegistryOn = true;
		mockRegistered = new Map([['goKanban', jest.fn()]]);
		render(<SidebarCommandModal publicTeam={false} variant="none" pages={MANAGER_PAGES} />);

		expect(registeredHandlerIds()).toContain('goTimesheets');
		expect(registeredHandlerIds()).toContain('goWeeklyLimit');
		expect(pageKeyCapsOf('Tasks › Kanban')).toEqual(['G', 'K']);
		// No handler is registered for it in this test: no key that would do nothing.
		expect(pageKeyCapsOf('Reports › Timesheets')).toEqual([]);
	});
});

describe('SidebarCommandModal keyboard shortcuts entry', () => {
	beforeEach(() => {
		mockUseKeyboardShortcuts.mockClear();
		mockSetOpen.mockClear();
		mockSetShortcutsSheetOpen.mockClear();
	});

	afterEach(() => {
		mockRegistryOn = false;
		mockRegistered = new Map();
	});

	it('opens the shortcuts sheet from the Settings group and closes the palette, showing the help key', () => {
		render(<SidebarCommandModal publicTeam={false} variant="none" />);

		expect(keyCapsOf('shortcuts.TITLE')).toEqual(['?']);
		fireEvent.click(screen.getByText('shortcuts.TITLE'));

		expect(mockSetOpen).toHaveBeenCalledWith(false);
		expect(mockSetShortcutsSheetOpen).toHaveBeenCalledWith(true);
	});

	it('shows the binding in force of the help with the registry, and still opens the sheet', () => {
		mockRegistryOn = true;
		mockRegistered = new Map([['helpOpen', jest.fn()]]);
		render(<SidebarCommandModal publicTeam={false} variant="none" />);

		expect(keyCapsOf('shortcuts.TITLE')).toEqual(['?']);
		fireEvent.click(screen.getByText('shortcuts.TITLE'));

		expect(mockSetShortcutsSheetOpen).toHaveBeenCalledWith(true);
	});

	it('hands its own key listener only the entries that have keys: no page row, no key-less entry', () => {
		render(<SidebarCommandModal publicTeam={false} variant="none" pages={MEMBER_PAGES} />);

		expect(registeredSequences()).not.toContain('');
		expect(registeredSequences()).toContain('k');
	});
});

describe('SidebarCommandModal chat entries', () => {
	afterEach(() => {
		mockChatOn = false;
	});

	it('offers the conversations and "New message" where the chat is on, with no key of their own', () => {
		mockChatOn = true;
		mockUseKeyboardShortcuts.mockClear();
		render(<SidebarCommandModal publicTeam={false} variant="none" />);
		expect(screen.getByTestId('chat-results')).toBeTruthy();
		const newMessage = screen.getByText('commandPalette.commands.newMessage');
		newMessage.click();
		expect(mockPush).toHaveBeenCalledWith('/chat?new=message');
		expect(registeredSequences()).not.toContain('');
	});

	it('leaves the chat out where it is off', () => {
		render(<SidebarCommandModal publicTeam={false} variant="none" />);
		expect(screen.queryByTestId('chat-results')).toBeNull();
		expect(screen.queryByText('commandPalette.commands.newMessage')).toBeNull();
	});
});
