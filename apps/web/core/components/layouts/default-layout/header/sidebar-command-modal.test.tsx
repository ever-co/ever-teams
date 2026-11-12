/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

let mockCanInvite = false;
let mockRegistryOn = false;
let mockRegistered = new Map<string, () => void>();
const mockUseKeyboardShortcuts = jest.fn();
const mockRegisterHandlers = jest.fn();
const mockSetOpen = jest.fn();

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
jest.mock('@/core/stores/common/shortcuts', () => ({ shortcutHandlersAtom: Symbol('shortcut-handlers') }));
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
	useAtomValue: () => mockRegistered
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
// The timer's side of the palette: what it offers, and what it is asked to do.
let mockCanStopTimer = false;
const mockStopTimer = jest.fn();
const mockStartTimerOn = jest.fn();
const mockOpenAddTime = jest.fn();
const TASK_TO_START = { id: 'task-9', title: 'Fix the login page' };
jest.mock('./palette-timer', () => ({
	usePaletteTimer: () => ({
		canStop: mockCanStopTimer,
		stopTimer: mockStopTimer,
		startTimerOn: mockStartTimerOn,
		openAddTime: mockOpenAddTime
	}),
	PaletteTimerLayer: () => <div data-testid="timer-layer" />,
	PaletteTimerStartResults: ({ search, onStartTimer }: { search: string; onStartTimer: (task: unknown) => void }) => (
		<button type="button" data-testid="timer-start-results" onClick={() => onStartTimer(TASK_TO_START)}>
			{search}
		</button>
	)
}));

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

/** The key caps an entry shows, read next to its description. */
function keyCapsOf(descriptionKey: string): string[] {
	const row = screen.getByText(descriptionKey).parentElement as HTMLElement;
	return Array.from(row.querySelectorAll('kbd')).map((cap) => cap.textContent ?? '');
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

describe('SidebarCommandModal timer entries', () => {
	beforeEach(() => {
		mockUseKeyboardShortcuts.mockClear();
		mockSetOpen.mockClear();
		mockStopTimer.mockClear();
		mockStartTimerOn.mockClear();
		mockOpenAddTime.mockClear();
	});

	afterEach(() => {
		mockCanStopTimer = false;
	});

	it('offers "Add time" and opens it once the palette is closed, with no key of its own', () => {
		render(<SidebarCommandModal publicTeam={false} variant="none" />);

		fireEvent.click(screen.getByText('commandPalette.commands.addTime'));

		expect(mockSetOpen).toHaveBeenCalledWith(false);
		expect(mockOpenAddTime).toHaveBeenCalledTimes(1);
		expect(registeredSequences()).not.toContain('');
	});

	it('offers "Stop timer" only while the timer can be stopped', () => {
		const { unmount } = render(<SidebarCommandModal publicTeam={false} variant="none" />);
		expect(screen.queryByText('commandPalette.commands.stopTimer')).toBeNull();
		unmount();

		mockCanStopTimer = true;
		render(<SidebarCommandModal publicTeam={false} variant="none" />);
		fireEvent.click(screen.getByText('commandPalette.commands.stopTimer'));

		expect(mockSetOpen).toHaveBeenCalledWith(false);
		expect(mockStopTimer).toHaveBeenCalledTimes(1);
	});

	it('lists the tasks to start the timer on once the member types, and starts the one chosen', () => {
		render(<SidebarCommandModal publicTeam={false} variant="none" />);
		expect(screen.queryByTestId('timer-start-results')).toBeNull();

		fireEvent.change(screen.getByLabelText('search'), { target: { value: 'login' } });
		fireEvent.click(screen.getByTestId('timer-start-results'));

		expect(mockSetOpen).toHaveBeenCalledWith(false);
		expect(mockStartTimerOn).toHaveBeenCalledWith(TASK_TO_START);
	});

	it('offers nothing of the timer to the visitor of a public team', () => {
		mockCanStopTimer = true;
		render(<SidebarCommandModal publicTeam variant="none" />);
		fireEvent.change(screen.getByLabelText('search'), { target: { value: 'login' } });

		expect(screen.queryByText('commandPalette.commands.addTime')).toBeNull();
		expect(screen.queryByText('commandPalette.commands.stopTimer')).toBeNull();
		expect(screen.queryByTestId('timer-start-results')).toBeNull();
		expect(screen.queryByTestId('timer-layer')).toBeNull();
	});
});
