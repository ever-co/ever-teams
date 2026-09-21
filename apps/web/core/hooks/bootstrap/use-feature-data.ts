'use client';

import { useGetCurrentOrganization } from '@/core/hooks/auth/use-current-organization';
import { useCurrencies } from '@/core/hooks/common/use-currencies';
import { useLanguageSettings } from '@/core/hooks/common/use-language-settings';
import { useTeamDailyPlans } from '@/core/hooks/daily-plans/use-team-daily-plans';
import { useTeamInvitationsQuery } from '@/core/hooks/invitations/use-team-invitations-query';
import { useEmployee } from '@/core/hooks/organizations/employees/use-employee';
import { useOrganizationProjectsQuery } from '@/core/hooks/organizations/projects/use-organization-projects-query';
import { useRolesQuery } from '@/core/hooks/roles/use-roles-query';
import { useEffect, useState } from 'react';

export function useCurrentOrganizationOwner() {
	useGetCurrentOrganization({ enabled: true });
}

export function useCurrenciesOwner() {
	return useCurrencies({ enabled: true });
}

export function useInviteDataOwner(open: boolean) {
	const employee = useEmployee({ enabled: open });
	const roles = useRolesQuery({ enabled: open });
	const invitations = useTeamInvitationsQuery({ enabled: open });

	return {
		...employee,
		...roles,
		...invitations,
		rolesLoading: roles.isLoading,
		rolesSuccess: roles.isSuccess
	};
}

export function useTeamDailyPlansOwner(featureEnabled = true) {
	return useTeamDailyPlans({ enabled: featureEnabled });
}

export function useSidebarDataOwner(publicTeam: boolean | undefined) {
	const [deferredReady, setDeferredReady] = useState(false);

	useEffect(() => {
		if (publicTeam) return;

		const idleWindow = window as typeof window & {
			requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
			cancelIdleCallback?: (id: number) => void;
		};
		let idleId: number | undefined;
		let fallbackTimer: number | undefined;
		const paintId = window.requestAnimationFrame(() => {
			if (idleWindow.requestIdleCallback) {
				idleId = idleWindow.requestIdleCallback(() => setDeferredReady(true), { timeout: 1200 });
			} else {
				fallbackTimer = window.setTimeout(() => setDeferredReady(true), 0);
			}
		});

		return () => {
			window.cancelAnimationFrame(paintId);
			if (idleId !== undefined) idleWindow.cancelIdleCallback?.(idleId);
			if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
		};
	}, [publicTeam]);

	const projects = useOrganizationProjectsQuery({ enabled: !publicTeam && deferredReady });
	useLanguageSettings({ enabled: Boolean(publicTeam) || deferredReady });

	return projects;
}
