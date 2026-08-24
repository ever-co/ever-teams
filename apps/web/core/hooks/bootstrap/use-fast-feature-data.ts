'use client';

import { FAST_APP_BOOTSTRAP } from '@/core/constants/config/constants';
import { useGetCurrentOrganization } from '@/core/hooks/auth/use-current-organization';
import { useCurrencies } from '@/core/hooks/common/use-currencies';
import { useTeamDailyPlans } from '@/core/hooks/daily-plans/use-team-daily-plans';
import { useTeamInvitationsQuery } from '@/core/hooks/invitations/use-team-invitations-query';
import { useEmployee } from '@/core/hooks/organizations/employees/use-employee';
import { useRolesQuery } from '@/core/hooks/roles/use-roles-query';
import { useLanguageSettings } from '@/core/hooks/common/use-language-settings';
import { useOrganizationProjectsQuery } from '@/core/hooks/organizations/projects/use-organization-projects-query';
import { useEffect, useState } from 'react';

export function useFastCurrentOrganizationOwner() {
	useGetCurrentOrganization({ enabled: FAST_APP_BOOTSTRAP.value });
}

export function useFastCurrenciesOwner() {
	return useCurrencies({ enabled: FAST_APP_BOOTSTRAP.value });
}

export function useFastInviteDataOwner(open: boolean) {
	const fastAndOpen = FAST_APP_BOOTSTRAP.value && open;
	const legacyOrOpen = !FAST_APP_BOOTSTRAP.value || open;
	const employee = useEmployee({ enabled: fastAndOpen });
	const roles = useRolesQuery({ enabled: legacyOrOpen });
	const invitations = useTeamInvitationsQuery({ enabled: legacyOrOpen });

	return {
		...employee,
		...roles,
		...invitations,
		rolesLoading: roles.isLoading,
		rolesSuccess: roles.isSuccess
	};
}

export function useFastTeamDailyPlansOwner(featureEnabled = true) {
	return useTeamDailyPlans({ enabled: FAST_APP_BOOTSTRAP.value && featureEnabled });
}

export function useFastSidebarDataOwner(publicTeam: boolean | undefined) {
	const fastBootstrap = FAST_APP_BOOTSTRAP.value;
	const [deferredReady, setDeferredReady] = useState(false);

	useEffect(() => {
		if (!fastBootstrap || publicTeam) return;

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
	}, [fastBootstrap, publicTeam]);

	const fastOwnerEnabled = fastBootstrap && !publicTeam && deferredReady;
	const projects = useOrganizationProjectsQuery({ enabled: fastBootstrap ? fastOwnerEnabled : true });
	useLanguageSettings({ enabled: fastOwnerEnabled });

	return projects;
}
