/** @jest-environment jsdom */

import { act, renderHook } from '@testing-library/react';

jest.mock('@/core/hooks/auth/use-current-organization', () => ({
	useGetCurrentOrganization: jest.fn()
}));
jest.mock('@/core/hooks/common/use-currencies', () => ({ useCurrencies: jest.fn(() => ({ currencies: [] })) }));
jest.mock('@/core/hooks/organizations/employees/use-employee', () => ({
	useEmployee: jest.fn(() => ({ workingEmployees: [] }))
}));
jest.mock('@/core/hooks/roles/use-roles-query', () => ({
	useRolesQuery: jest.fn(() => ({ roles: [], isLoading: false, isSuccess: true }))
}));
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
import { useLanguageSettings } from '@/core/hooks/common/use-language-settings';
import { useTeamDailyPlans } from '@/core/hooks/daily-plans/use-team-daily-plans';
import { useTeamInvitationsQuery } from '@/core/hooks/invitations/use-team-invitations-query';
import { useEmployee } from '@/core/hooks/organizations/employees/use-employee';
import { useOrganizationProjectsQuery } from '@/core/hooks/organizations/projects/use-organization-projects-query';
import { useRolesQuery } from '@/core/hooks/roles/use-roles-query';
import {
	useCurrenciesOwner,
	useCurrentOrganizationOwner,
	useInviteDataOwner,
	useSidebarDataOwner,
	useTeamDailyPlansOwner
} from './use-feature-data';

const mockUseGetCurrentOrganization = jest.mocked(useGetCurrentOrganization);
const mockUseCurrencies = jest.mocked(useCurrencies);
const mockUseEmployee = jest.mocked(useEmployee);
const mockUseRolesQuery = jest.mocked(useRolesQuery);
const mockUseTeamInvitationsQuery = jest.mocked(useTeamInvitationsQuery);
const mockUseTeamDailyPlans = jest.mocked(useTeamDailyPlans);
const mockUseLanguageSettings = jest.mocked(useLanguageSettings);
const mockUseOrganizationProjectsQuery = jest.mocked(useOrganizationProjectsQuery);

describe('feature data owners', () => {
	beforeEach(() => jest.clearAllMocks());

	it('owns organization and currency reads only at their rendering surfaces', () => {
		renderHook(() => {
			useCurrentOrganizationOwner();
			useCurrenciesOwner();
		});

		expect(mockUseGetCurrentOrganization).toHaveBeenCalledWith({ enabled: true });
		expect(mockUseCurrencies).toHaveBeenCalledWith({ enabled: true });
	});

	it('starts invite data only while the modal is open', () => {
		const view = renderHook(({ open }) => useInviteDataOwner(open), { initialProps: { open: false } });
		expect(mockUseEmployee).toHaveBeenLastCalledWith({ enabled: false });
		expect(mockUseRolesQuery).toHaveBeenLastCalledWith({ enabled: false });
		expect(mockUseTeamInvitationsQuery).toHaveBeenLastCalledWith({ enabled: false });

		view.rerender({ open: true });
		expect(mockUseEmployee).toHaveBeenLastCalledWith({ enabled: true });
		expect(mockUseRolesQuery).toHaveBeenLastCalledWith({ enabled: true });
		expect(mockUseTeamInvitationsQuery).toHaveBeenLastCalledWith({ enabled: true });
	});

	it('starts team plans only on an eligible feature surface', () => {
		const view = renderHook(({ enabled }) => useTeamDailyPlansOwner(enabled), {
			initialProps: { enabled: false }
		});
		expect(mockUseTeamDailyPlans).toHaveBeenLastCalledWith({ enabled: false });

		view.rerender({ enabled: true });
		expect(mockUseTeamDailyPlans).toHaveBeenLastCalledWith({ enabled: true });
	});

	it('defers private sidebar reads until after paint and idle', () => {
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

		renderHook(() => useSidebarDataOwner(false));
		expect(mockUseOrganizationProjectsQuery).toHaveBeenLastCalledWith({ enabled: false });
		expect(mockUseLanguageSettings).toHaveBeenLastCalledWith({ enabled: false });

		act(() => {
			paint?.(1);
			idle?.({ didTimeout: false, timeRemaining: () => 50 });
		});

		expect(mockUseOrganizationProjectsQuery).toHaveBeenLastCalledWith({ enabled: true });
		expect(mockUseLanguageSettings).toHaveBeenLastCalledWith({ enabled: true });
	});

	it('loads public-team languages without starting authenticated project ownership', () => {
		window.requestAnimationFrame = jest.fn();
		renderHook(() => useSidebarDataOwner(true));

		expect(mockUseOrganizationProjectsQuery).toHaveBeenLastCalledWith({ enabled: false });
		expect(mockUseLanguageSettings).toHaveBeenLastCalledWith({ enabled: true });
		expect(window.requestAnimationFrame).not.toHaveBeenCalled();
	});
});
