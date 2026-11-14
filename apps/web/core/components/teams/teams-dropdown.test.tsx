/**
 * @jest-environment jsdom
 */
/**
 * The team menu while another organization of the workspace opens (ever-co/ever-teams#5204): a team of the current
 * organization picked meanwhile would write its team and organization over the switch's, so the current
 * organization's teams wait, with their settings, until the page is replaced.
 */
import type { MouseEvent, ReactNode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ push: jest.fn() }) }));
jest.mock('next/link', () => ({
	__esModule: true,
	default: ({
		children,
		href,
		onClick,
		...rest
	}: {
		children?: ReactNode;
		href: string;
		onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
	}) => (
		<a href={href} onClick={onClick} {...rest}>
			{children}
		</a>
	)
}));
jest.mock('sonner', () => ({ toast: { warning: jest.fn(), error: jest.fn() } }));

const mockSetActiveTeam = jest.fn();
jest.mock('@/core/hooks', () => ({
	useModal: () => ({ isOpen: false, openModal: jest.fn(), closeModal: jest.fn() }),
	useCreateOrganizationTeam: () => ({ setActiveTeam: mockSetActiveTeam })
}));
jest.mock('@/core/hooks/users/use-profile-validation', () => ({
	useProfileValidation: () => ({ validateTeamSwitch: () => true })
}));
jest.mock('@/core/hooks/organizations/teams/use-organization-teams-managers', () => ({
	useOrganizationAndTeamManagers: () => ({ userManagedTeams: [] })
}));
jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({ data: { id: 'user-1', isEmailVerified: true } })
}));
jest.mock('@/core/hooks/organizations/teams/use-active-team-snapshot', () => ({ useActiveTeamSnapshot: () => null }));
jest.mock('@/core/components/optimized-components/teams', () => ({ LazyCreateTeamModal: () => null }));
jest.mock('../duplicated-components/tooltip', () => ({
	Tooltip: ({ children }: { children?: ReactNode }) => <>{children}</>
}));
jest.mock('@/core/components/common/entity-tile', () => ({ EntityTile: () => <span /> }));
jest.mock('@/core/components/common/skeleton', () => ({ Skeleton: () => <span /> }));
jest.mock('@/core/components/common/dropdown-menu', () => {
	const Pass = ({ children }: { children?: ReactNode }) => <>{children}</>;
	return {
		DropdownMenu: Pass,
		DropdownMenuTrigger: Pass,
		DropdownMenuContent: Pass,
		DropdownMenuGroup: ({ children }: { children?: ReactNode }) => <div role="group">{children}</div>,
		DropdownMenuLabel: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
		DropdownMenuSeparator: () => <hr />,
		DropdownMenuItem: ({
			children,
			disabled,
			onClick
		}: {
			children?: ReactNode;
			disabled?: boolean;
			onClick?: () => void;
		}) => (
			<div role="menuitem" aria-disabled={disabled ? 'true' : undefined} onClick={disabled ? undefined : onClick}>
				{children}
			</div>
		)
	};
});

const labsDesign = { id: 'labs-design', name: 'Labs Design', organizationId: 'labs', members: [] };
jest.mock('@/core/hooks/organizations/teams/use-team-menu-organizations', () => ({
	useTeamMenuOrganizations: () => ({
		data: {
			current: { id: 'studio', name: 'Studio' },
			others: [{ id: 'labs', name: 'Labs', teams: [labsDesign], teamsListed: true }]
		},
		isLoading: false,
		isError: false,
		refetch: jest.fn()
	})
}));

const mockSwitch = { isPending: false, isSuccess: false, variables: undefined as unknown, mutate: jest.fn() };
jest.mock('@/core/hooks/organizations/teams/use-switch-organization', () => ({
	useSwitchOrganization: () => mockSwitch
}));

import {
	activeTeamIdState,
	localTimerStatusState,
	organizationTeamsState,
	timerStartsInFlightState,
	timerStatusState
} from '@/core/stores';
import { TeamsDropDown } from './teams-dropdown';

const studioTeams = [
	{ id: 'studio-design', name: 'Studio Design', organizationId: 'studio', members: [] },
	{ id: 'studio-ops', name: 'Studio Ops', organizationId: 'studio', members: [] }
];

function renderDropdown({
	startsInFlight = 0,
	isLocalTimerRunning = false,
	queryClient = new QueryClient()
}: { startsInFlight?: number; isLocalTimerRunning?: boolean; queryClient?: QueryClient } = {}) {
	const store = createStore();
	store.set(organizationTeamsState, studioTeams as never);
	store.set(activeTeamIdState, 'studio-design');
	store.set(timerStatusState, { running: false } as never);
	store.set(timerStartsInFlightState, startsInFlight);
	store.set(localTimerStatusState, { lastTaskId: 'task-1', runnedDateTime: 0, running: isLocalTimerRunning });
	render(
		<QueryClientProvider client={queryClient}>
			<Provider store={store}>
				<TeamsDropDown />
			</Provider>
		</QueryClientProvider>
	);
}

const studioOps = () => screen.getByRole('menuitem', { name: /Studio Ops/ });
const studioOpsSettings = () => studioOps().querySelector('a') as HTMLAnchorElement;

describe('TeamsDropDown while another organization opens', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockSwitch.isPending = false;
		mockSwitch.isSuccess = false;
		mockSwitch.variables = undefined;
	});

	it("lets the current organization's teams be picked when no switch runs", () => {
		renderDropdown();

		fireEvent.click(studioOps());

		expect(mockSetActiveTeam).toHaveBeenCalledWith(expect.objectContaining({ id: 'studio-ops' }));
	});

	it("keeps the current organization's teams and their settings unavailable during the switch", () => {
		mockSwitch.isPending = true;
		mockSwitch.variables = { organizationId: 'labs' };
		renderDropdown();

		expect(studioOps().getAttribute('aria-disabled')).toBe('true');
		const settingsClick = fireEvent.click(studioOpsSettings());

		expect(settingsClick).toBe(false);
		expect(mockSetActiveTeam).not.toHaveBeenCalled();
	});

	it('keeps team creation unavailable during the switch', () => {
		mockSwitch.isPending = true;
		mockSwitch.variables = { organizationId: 'labs' };
		renderDropdown();

		expect(screen.getByRole('menuitem', { name: /common.CREATE_TEAM/ }).getAttribute('aria-disabled')).toBe('true');
	});

	it('refuses to open another organization while a timer start is on its way', () => {
		renderDropdown({ startsInFlight: 1 });

		fireEvent.click(screen.getByRole('menuitem', { name: /Labs Design/ }));

		expect(mockSwitch.mutate).not.toHaveBeenCalled();
	});

	it("refuses to open another organization or team while this tab's timer runs, before the server says so", () => {
		renderDropdown({ isLocalTimerRunning: true });

		fireEvent.click(screen.getByRole('menuitem', { name: /Labs Design/ }));

		expect(mockSwitch.mutate).not.toHaveBeenCalled();
		expect(studioOps().getAttribute('aria-disabled')).toBe('true');
	});

	it('refuses to open another organization while a write is still on its way', async () => {
		const queryClient = new QueryClient();
		// A save the page that the switch replaces would cut off
		const save = queryClient
			.getMutationCache()
			.build(queryClient, { mutationFn: () => new Promise(() => undefined) });
		void save.execute(undefined);
		await act(async () => undefined);
		renderDropdown({ queryClient });

		fireEvent.click(screen.getByRole('menuitem', { name: /Labs Design/ }));

		expect(mockSwitch.mutate).not.toHaveBeenCalled();
		queryClient.clear();
	});

	it('keeps them unavailable once the switch is done, until the page is replaced', () => {
		mockSwitch.isSuccess = true;
		mockSwitch.variables = { organizationId: 'labs' };
		renderDropdown();

		expect(studioOps().getAttribute('aria-disabled')).toBe('true');
		fireEvent.click(studioOpsSettings());

		expect(mockSetActiveTeam).not.toHaveBeenCalled();
	});
});
