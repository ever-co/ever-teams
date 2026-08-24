/** @jest-environment jsdom */

import { act, renderHook } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

jest.mock('@/core/constants/config/constants', () => ({
	FAST_APP_BOOTSTRAP: {
		get value() {
			return process.env.TEST_FAST_APP_BOOTSTRAP === 'true';
		}
	}
}));
jest.mock('@/core/hooks/auth/use-current-organization', () => ({
	useGetCurrentOrganization: jest.fn()
}));
jest.mock('@/core/hooks/common/use-currencies', () => ({ useCurrencies: jest.fn(() => ({ currencies: [] })) }));
jest.mock('@/core/hooks/organizations/employees/use-employee', () => ({
	useEmployee: jest.fn(() => ({ workingEmployees: [] }))
}));
jest.mock('@/core/hooks/roles/use-roles-query', () => ({ useRolesQuery: jest.fn(() => ({ roles: [] })) }));
jest.mock('@/core/hooks/invitations/use-team-invitations-query', () => ({
	useTeamInvitationsQuery: jest.fn(() => ({ teamInvitations: [] }))
}));
jest.mock('@/core/hooks/daily-plans/use-team-daily-plans', () => ({
	useTeamDailyPlans: jest.fn()
}));
jest.mock('@/core/hooks/common/use-language-settings', () => ({
	useLanguageSettings: jest.fn(() => ({ languages: [] }))
}));
jest.mock('@/core/hooks/organizations/projects/use-organization-projects-query', () => ({
	useOrganizationProjectsQuery: jest.fn(() => ({ organizationProjects: [] }))
}));

import { useGetCurrentOrganization } from '@/core/hooks/auth/use-current-organization';
import { useCurrencies } from '@/core/hooks/common/use-currencies';
import { useTeamDailyPlans } from '@/core/hooks/daily-plans/use-team-daily-plans';
import { useTeamInvitationsQuery } from '@/core/hooks/invitations/use-team-invitations-query';
import { useEmployee } from '@/core/hooks/organizations/employees/use-employee';
import { useRolesQuery } from '@/core/hooks/roles/use-roles-query';
import { useLanguageSettings } from '@/core/hooks/common/use-language-settings';
import { useOrganizationProjectsQuery } from '@/core/hooks/organizations/projects/use-organization-projects-query';

import {
	useFastCurrenciesOwner,
	useFastCurrentOrganizationOwner,
	useFastInviteDataOwner,
	useFastSidebarDataOwner,
	useFastTeamDailyPlansOwner
} from './use-fast-feature-data';

const mockUseGetCurrentOrganization = jest.mocked(useGetCurrentOrganization);
const mockUseCurrencies = jest.mocked(useCurrencies);
const mockUseEmployee = jest.mocked(useEmployee);
const mockUseRolesQuery = jest.mocked(useRolesQuery);
const mockUseTeamInvitationsQuery = jest.mocked(useTeamInvitationsQuery);
const mockUseTeamDailyPlans = jest.mocked(useTeamDailyPlans);
const mockUseLanguageSettings = jest.mocked(useLanguageSettings);
const mockUseOrganizationProjectsQuery = jest.mocked(useOrganizationProjectsQuery);

describe('fast feature data owners', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		process.env.TEST_FAST_APP_BOOTSTRAP = 'true';
	});

	it('loads current organization and currencies only in the fast path', () => {
		renderHook(() => {
			useFastCurrentOrganizationOwner();
			useFastCurrenciesOwner();
		});

		expect(mockUseGetCurrentOrganization).toHaveBeenCalledWith({ enabled: true });
		expect(mockUseCurrencies).toHaveBeenCalledWith({ enabled: true });

		jest.clearAllMocks();
		process.env.TEST_FAST_APP_BOOTSTRAP = 'false';
		renderHook(() => {
			useFastCurrentOrganizationOwner();
			useFastCurrenciesOwner();
		});

		expect(mockUseGetCurrentOrganization).toHaveBeenCalledWith({ enabled: false });
		expect(mockUseCurrencies).toHaveBeenCalledWith({ enabled: false });
	});

	it('loads invite-only data only while the modal is open in the fast path', () => {
		renderHook(() => useFastInviteDataOwner(false));

		expect(mockUseEmployee).toHaveBeenCalledWith({ enabled: false });
		expect(mockUseRolesQuery).toHaveBeenCalledWith({ enabled: false });
		expect(mockUseTeamInvitationsQuery).toHaveBeenCalledWith({ enabled: false });

		jest.clearAllMocks();
		renderHook(() => useFastInviteDataOwner(true));

		expect(mockUseEmployee).toHaveBeenCalledWith({ enabled: true });
		expect(mockUseRolesQuery).toHaveBeenCalledWith({ enabled: true });
		expect(mockUseTeamInvitationsQuery).toHaveBeenCalledWith({ enabled: true });
	});

	it('preserves legacy modal ownership while avoiding a second employee owner', () => {
		process.env.TEST_FAST_APP_BOOTSTRAP = 'false';
		renderHook(() => useFastInviteDataOwner(false));

		expect(mockUseEmployee).toHaveBeenCalledWith({ enabled: false });
		expect(mockUseRolesQuery).toHaveBeenCalledWith({ enabled: true });
		expect(mockUseTeamInvitationsQuery).toHaveBeenCalledWith({ enabled: true });
	});

	it('loads team plans only on an eligible fast feature surface', () => {
		renderHook(() => useFastTeamDailyPlansOwner(true));
		expect(mockUseTeamDailyPlans).toHaveBeenCalledWith({ enabled: true });

		jest.clearAllMocks();
		renderHook(() => useFastTeamDailyPlansOwner(false));
		expect(mockUseTeamDailyPlans).toHaveBeenCalledWith({ enabled: false });

		jest.clearAllMocks();
		process.env.TEST_FAST_APP_BOOTSTRAP = 'false';
		renderHook(() => useFastTeamDailyPlansOwner(true));
		expect(mockUseTeamDailyPlans).toHaveBeenCalledWith({ enabled: false });
	});

	it('defers private fast-sidebar projects and languages until after paint and idle', () => {
		let paint: FrameRequestCallback | undefined;
		let idle: IdleRequestCallback | undefined;
		window.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
			paint = callback;
			return 1;
		});
		window.requestIdleCallback = jest.fn((callback: IdleRequestCallback) => {
			idle = callback;
			return 2;
		});

		const { result } = renderHook(() => useFastSidebarDataOwner(false));
		expect(mockUseOrganizationProjectsQuery).toHaveBeenLastCalledWith({ enabled: false });
		expect(mockUseLanguageSettings).toHaveBeenLastCalledWith({ enabled: false });
		expect(result.current.organizationProjects).toEqual([]);

		act(() => {
			paint?.(1);
			idle?.({ didTimeout: false, timeRemaining: () => 50 });
		});

		expect(mockUseOrganizationProjectsQuery).toHaveBeenLastCalledWith({ enabled: true });
		expect(mockUseLanguageSettings).toHaveBeenLastCalledWith({ enabled: true });
	});

	it('never starts fast sidebar ownership for a public team', () => {
		window.requestAnimationFrame = jest.fn();
		renderHook(() => useFastSidebarDataOwner(true));

		expect(mockUseOrganizationProjectsQuery).toHaveBeenLastCalledWith({ enabled: false });
		expect(mockUseLanguageSettings).toHaveBeenLastCalledWith({ enabled: false });
	});

	it('preserves legacy sidebar project ownership without adding a second language owner', () => {
		process.env.TEST_FAST_APP_BOOTSTRAP = 'false';
		renderHook(() => useFastSidebarDataOwner(false));

		expect(mockUseOrganizationProjectsQuery).toHaveBeenLastCalledWith({ enabled: true });
		expect(mockUseLanguageSettings).toHaveBeenLastCalledWith({ enabled: false });
	});

	it('routes authenticated shell language consumers through the deferred owner', () => {
		const dropdownSource = readFileSync(
			resolve(__dirname, '../../components/common/language-dropdown-flags.tsx'),
			'utf8'
		);
		const footerSource = readFileSync(
			resolve(__dirname, '../../components/layouts/default-layout/footer.tsx'),
			'utf8'
		);
		const navSource = readFileSync(resolve(__dirname, '../../components/users/user-nav-menu.tsx'), 'utf8');
		const authSource = readFileSync(
			resolve(__dirname, '../../components/layouts/default-layout/auth-layout.tsx'),
			'utf8'
		);

		expect(dropdownSource).toMatch(/enabled:\s*!deferFastBootstrap\s*\|\|\s*!FAST_APP_BOOTSTRAP\.value/);
		expect(footerSource).toMatch(/LanguageDropDownWithFlags[\s\S]*deferFastBootstrap/);
		expect(navSource).toMatch(/LanguageDropDownWithFlags[\s\S]*deferFastBootstrap/);
		expect(authSource).not.toMatch(/LanguageDropDownWithFlags[\s\S]{0,120}deferFastBootstrap/);
	});
});
