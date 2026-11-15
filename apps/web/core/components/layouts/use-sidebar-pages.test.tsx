/** @jest-environment jsdom */

import { renderHook } from '@testing-library/react';

let mockCanManageTeam = false;
let mockIsPaletteOpen = false;
let mockHidden = new Set<string>(['automations']);
const mockUseHiddenSettingsEntries = jest.fn((asks: boolean) => {
	void asks;
	return mockHidden;
});

jest.mock('@/core/stores', () => ({ canManageActiveTeamState: 'can-manage-team' }));
jest.mock('@/core/stores/common/command-palette', () => ({ commandPaletteOpenAtom: 'palette-open' }));
jest.mock('jotai', () => ({
	useAtomValue: (atom: string) => (atom === 'can-manage-team' ? mockCanManageTeam : mockIsPaletteOpen)
}));
jest.mock('@/core/hooks/settings/use-hidden-settings-entries', () => ({
	useHiddenSettingsEntries: (asks: boolean) => mockUseHiddenSettingsEntries(asks)
}));
const mockT = (key: string) => key;
jest.mock('next-intl', () => ({ useTranslations: () => mockT }));
jest.mock('@/core/components/icons', () => new Proxy({}, { get: () => () => null }));

import { useSidebarPages } from './use-sidebar-pages';

const LINKS = [{ title: 'Home', url: '/' }];
const GROUPS = [{ title: 'Tasks', url: '#', selectable: false, items: [{ title: 'Kanban', url: '/kanban' }] }];

function settingsUrlsOf(pages: Array<{ url: string; section?: string }>): string[] {
	return pages.filter((page) => page.section === 'common.SETTINGS').map((page) => page.url);
}

describe('useSidebarPages', () => {
	beforeEach(() => {
		mockCanManageTeam = false;
		mockIsPaletteOpen = false;
		mockHidden = new Set<string>(['automations']);
		mockUseHiddenSettingsEntries.mockClear();
	});

	it('lists the pages of the sidebar first, then the settings pages under Settings', () => {
		const { result } = renderHook(() => useSidebarPages(LINKS, GROUPS));

		expect(result.current.slice(0, 2)).toEqual([
			{ title: 'Home', url: '/' },
			{ title: 'Kanban', url: '/kanban', section: 'Tasks' }
		]);
		expect(result.current[2]).toEqual({
			title: 'settings.entries.profile.TITLE',
			url: '/settings/personal',
			section: 'common.SETTINGS'
		});
	});

	it('leaves the settings pages of the team managers out for a member, as the settings sidebar does', () => {
		const member = renderHook(() => useSidebarPages(LINKS, GROUPS));
		expect(settingsUrlsOf(member.result.current)).toContain('/settings/team/statuses');
		expect(settingsUrlsOf(member.result.current)).not.toContain('/settings/team/members');
		expect(settingsUrlsOf(member.result.current)).not.toContain('/permissions');

		mockCanManageTeam = true;
		const manager = renderHook(() => useSidebarPages(LINKS, GROUPS));
		expect(settingsUrlsOf(manager.result.current)).toContain('/settings/team/members');
		expect(settingsUrlsOf(manager.result.current)).toContain('/permissions');
	});

	it('lists an optional settings page only while the deployment offers it', () => {
		mockCanManageTeam = true;
		const hidden = renderHook(() => useSidebarPages(LINKS, GROUPS));
		expect(settingsUrlsOf(hidden.result.current)).not.toContain('/settings/team/automations');

		mockHidden = new Set<string>();
		const offered = renderHook(() => useSidebarPages(LINKS, GROUPS));
		expect(settingsUrlsOf(offered.result.current)).toContain('/settings/team/automations');
	});

	it('asks the platform for the optional pages only once a manager has the palette open', () => {
		mockCanManageTeam = true;
		renderHook(() => useSidebarPages(LINKS, GROUPS));
		expect(mockUseHiddenSettingsEntries).toHaveBeenLastCalledWith(false);

		mockIsPaletteOpen = true;
		renderHook(() => useSidebarPages(LINKS, GROUPS));
		expect(mockUseHiddenSettingsEntries).toHaveBeenLastCalledWith(true);

		mockCanManageTeam = false;
		renderHook(() => useSidebarPages(LINKS, GROUPS));
		expect(mockUseHiddenSettingsEntries).toHaveBeenLastCalledWith(false);
	});
});
