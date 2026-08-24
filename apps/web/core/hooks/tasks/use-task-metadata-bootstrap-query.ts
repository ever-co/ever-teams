'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { FAST_APP_BOOTSTRAP } from '@/core/constants/config/constants';
import {
	getActiveProjectIdCookie,
	getActiveTeamIdCookie,
	getOrganizationIdCookie,
	getTenantIdCookie
} from '@/core/lib/helpers/cookies';
import { queryKeys } from '@/core/query/keys';
import { taskMetadataBootstrapService } from '@/core/services/client/api/tasks/task-metadata-bootstrap.service';
import { activeTeamIdState, activeTeamState, publicState } from '@/core/stores';
import { TASK_METADATA_SECTIONS } from '@/core/types/interfaces/task/task-metadata-bootstrap';
import { useUserQuery } from '../queries/user-user.query';
import { createTaskMetadataScope } from './task-metadata-cache';

const DISABLED_SCOPE = { tenantId: '', organizationId: '', organizationTeamId: '' } as const;

export function useTaskMetadataBootstrapQuery({ enabled = true }: { enabled?: boolean } = {}) {
	const activeTeamId = useAtomValue(activeTeamIdState);
	const activeTeam = useAtomValue(activeTeamState);
	const publicTeam = useAtomValue(publicState);
	const { data: user } = useUserQuery();

	const teamId = activeTeam?.id || getActiveTeamIdCookie() || activeTeamId;
	const organizationId = user?.employee?.organizationId || getOrganizationIdCookie();
	const tenantId = user?.employee?.tenantId || getTenantIdCookie();
	const projectId = getActiveProjectIdCookie();
	const scope = useMemo(
		() => createTaskMetadataScope(tenantId, organizationId, teamId, projectId),
		[organizationId, projectId, teamId, tenantId]
	);
	const useBootstrap = FAST_APP_BOOTSTRAP.value === true && !publicTeam;

	const query = useQuery({
		queryKey: queryKeys.taskMetadata.bootstrap(scope ?? DISABLED_SCOPE, TASK_METADATA_SECTIONS),
		queryFn: ({ signal }) => {
			if (!scope) {
				throw new Error('Required parameters missing: tenantId, organizationId, and teamId are required');
			}
			return taskMetadataBootstrapService.getTaskMetadataBootstrap(scope, TASK_METADATA_SECTIONS, signal);
		},
		enabled: enabled && useBootstrap && Boolean(scope),
		staleTime: 5 * 60 * 1000,
		gcTime: 15 * 60 * 1000
	});

	return { ...query, scope, teamId, useBootstrap };
}
