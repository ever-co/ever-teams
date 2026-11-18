import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const WEB_ROOT = resolve(__dirname, '../..');

function sourceOf(file: string): string {
	return readFileSync(resolve(WEB_ROOT, file), 'utf8');
}

/**
 * The cold-start budget (cypress/e2e/startup-performance.cy.ts) allows 12 Gauzy reads before the shell is ready on a
 * cold /team/tasks. The shell (sidebar, header, team menu, timer) is on every page, so a probe it runs on mount is a
 * read of every page load. These are asked only when their part of the UI needs them: the settings probes once the
 * command palette is open, the organization's break setting while the timer runs, the other organizations once the
 * person reaches for the team menu, and the Goals entry once the shell has settled (InitState, shell.ts).
 */
const SHELL_FILES = [
	'core/components/layouts/app-sidebar.tsx',
	'core/components/layouts/use-sidebar-pages.ts',
	'core/components/layouts/default-layout/navbar.tsx',
	'core/components/teams/teams-dropdown.tsx',
	'core/components/timer/timer.tsx',
	'core/hooks/timer/use-timer-break.ts'
];

/** Probes whose call without arguments reads on mount. */
const PROBES_READ_ON_MOUNT = [
	'useTimeGoals()',
	'useTeamMenuOrganizations()',
	'useUserApiTokensAvailability()',
	'useTwoFactorStatus()',
	'useBreaksAllowed()',
	'useHiddenSettingsEntries(canManageTeam)'
];

describe('reads of the app shell before it is ready', () => {
	it.each(SHELL_FILES)('%s runs no optional probe on mount', (file) => {
		const source = sourceOf(file);
		for (const probe of PROBES_READ_ON_MOUNT) {
			expect(source).not.toContain(probe);
		}
	});

	it('asks the optional settings pages of the platform only once the command palette is open', () => {
		expect(sourceOf('core/components/layouts/use-sidebar-pages.ts')).toContain(
			'useHiddenSettingsEntries(canManageTeam, isPaletteOpen)'
		);
		const hiddenEntries = sourceOf('core/hooks/settings/use-hidden-settings-entries.ts');
		expect(hiddenEntries).toContain('useTaskAutomationsAvailability(canManageTeam && asks)');
		expect(hiddenEntries).toContain('useUserApiTokensAvailability(asks)');
		expect(hiddenEntries).toContain('useTwoFactorStatus(asks)');
	});

	it("reads the organization's break setting only while the timer runs", () => {
		expect(sourceOf('core/hooks/timer/use-timer-break.ts')).toContain(
			'useBreaksAllowed(Boolean(timerStatus?.running))'
		);
	});

	it('reads the other organizations of the team menu once the person reaches for it', () => {
		const source = sourceOf('core/components/teams/teams-dropdown.tsx');
		expect(source).toContain('useTeamMenuOrganizations({ enabled: reachedForMenu || menuOpen })');
		expect(source).toMatch(/onPointerEnter=\{reachForMenu\}/);
		expect(source).toMatch(/onFocus=\{reachForMenu\}/);
	});

	it('asks whether entries carry labels once the shell has settled: the timer offers Labels on every page', () => {
		expect(sourceOf('core/components/timer/timer-entry-toggles.tsx')).toContain('<TimerLabelsControl');
		expect(sourceOf('core/hooks/timer/use-entry-labels-support.ts')).toContain(
			'enabled: hasWorkspace && shellSettled'
		);
	});

	it('asks for the Goals entry once the shell has settled, which InitState decides after its ready mark', () => {
		expect(sourceOf('core/components/layouts/app-sidebar.tsx')).toContain(
			'useTimeGoals({ enabled: shellSettled })'
		);
		const initState = sourceOf('core/components/layouts/app/init-state.tsx');
		expect(initState).toContain("performance.mark('ever-teams:shell-ready')");
		expect(initState).toMatch(/window\.setTimeout\(\(\) => setShellSettled\(true\), delay\)/);
	});
});
