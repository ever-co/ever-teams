'use client';
import { setActiveTeamIdCookie, setOrganizationIdCookie } from '@/core/lib/helpers/cookies';
import { activeTeamIdState, isTeamMemberState, organizationTeamsState } from '@/core/stores';
import { useCallback } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationTeamService } from '@/core/services/client/api/organizations/teams';
import { useSyncRef } from '../../common';
import { useAuthenticateUser } from '../../auth';
import { TOrganizationTeam, organizationTeamSchema } from '@/core/types/schemas';
import { validatePaginationResponse, ZodValidationError } from '@/core/types/schemas/utils/validation';
import { queryKeys } from '@/core/query/keys';

/**
 * ✅ PHASE 2 MIGRATION: React Query implementation for creating organization teams
 * Maintains 100% backward compatibility while adding React Query benefits:
 * - Automatic cache invalidation
 * - Zod validation
 * - Better error handling
 * - Preserves all critical side-effects (cookies, refreshToken, setActiveTeam)
 */
export function useCreateOrganizationTeam() {
	const queryClient = useQueryClient();
	const [teams, setTeams] = useAtom(organizationTeamsState);
	const teamsRef = useSyncRef(teams);
	const setActiveTeamId = useSetAtom(activeTeamIdState);
	const { refreshToken, $user } = useAuthenticateUser();
	const [isTeamMember, setIsTeamMember] = useAtom(isTeamMemberState);

	// ✅ React Query mutation with full validation and critical side-effects preservation
	const createOrganizationTeamMutation = useMutation({
		mutationFn: ({ name, user }: { name: string; user: any }) => {
			return organizationTeamService.createOrganizationTeam(name, user);
		},
		mutationKey: queryKeys.organizationTeams.mutations.create(null),
		onSuccess: async (response, { name }) => {
			// ✅ Validate API response with Zod schema (pagination response)
			const validatedData = validatePaginationResponse(
				organizationTeamSchema,
				response.data,
				'createOrganizationTeam mutation response'
			);

			// ✅ Preserve all original side-effects - CRITICAL for team creation
			const dt = validatedData.items || [];
			setTeams(dt);
			const created = dt.find((t: TOrganizationTeam) => t.name === name);

			if (created) {
				setActiveTeamIdCookie(created.id);
				setOrganizationIdCookie(created.organizationId || '');
				// This must be called at the end (Update store)
				setActiveTeamId(created.id);

				if (!isTeamMember) {
					setIsTeamMember(true);
				}

				/**
				 * DO NOT REMOVE - CRITICAL
				 * Refresh Token needed for the first time when new Organization is created,
				 * As in backend permissions are getting updated
				 */
				await refreshToken();
			}

			// ✅ Cache invalidation for consistency
			queryClient.invalidateQueries({
				queryKey: queryKeys.organizationTeams.all
			});
		},
		onError: (error) => {
			// ✅ Enhanced error handling with Zod validation errors
			if (error instanceof ZodValidationError) {
				console.error('Create team validation failed:', {
					message: error.message,
					issues: error.issues
				});
			}
			// Original error will be thrown and handled by calling code
		}
	});

	// ✅ Preserve exact same interface and logic as original
	const createOrganizationTeam = useCallback(
		(name: string) => {
			const teams = teamsRef.current;
			const $name = name.trim();
			const teamExists = teams.find((t: TOrganizationTeam) => t.name.toLowerCase() === $name.toLowerCase());

			if (teamExists) {
				return Promise.reject(new Error('Team with this name already exists'));
			}
			if ($name.length < 2) {
				return Promise.reject(new Error('Team name must be at least 2 characters long'));
			}
			if (!$user.current) {
				return Promise.reject(new Error('User authentication required'));
			}

			// ✅ Use React Query mutation with Promise interface preserved
			return createOrganizationTeamMutation.mutateAsync({ name: $name, user: $user.current });
		},
		[createOrganizationTeamMutation, teamsRef, $user]
	);

	return {
		createOrganizationTeam,
		loading: createOrganizationTeamMutation.isPending // ✅ Map to legacy loading interface
	};
}
